import type { LinearProjectIssue } from "./project-issues.ts";
import { fetchLinearProjectIssues } from "./project-issues.ts";
import { getLinearAuthToken } from "./auth-token.ts";
import { loadSettings, saveSettings } from "../store.ts";
import type { LinearProjectWatcherConfig, LinearProjectWatchersMap } from "../types.ts";

export const DEFAULT_WATCHER_POLL_INTERVAL_MS = 30_000;
export const MIN_WATCHER_POLL_INTERVAL_MS = 15_000;
export const MAX_WATCHER_POLL_INTERVAL_MS = 60_000;
export const WATCHER_TICK_INTERVAL_MS = 5_000;
export const MAX_WATCHER_BACKOFF_MS = 300_000;

export type WatcherIssueSnapshot = {
  id: string;
  identifier: string;
  title: string;
  status: string;
  stateId: string | null;
  priority: number;
  assigneeName: string | null;
  updatedAt: string | null;
  url: string;
};

export type LinearWatcherChangeKind =
  | "issue_created"
  | "status_changed"
  | "assignee_changed"
  | "priority_changed"
  | "title_changed"
  | "updated";

export type LinearWatcherChangeEvent = {
  type: "linear.watcher.change";
  projectId: string;
  projectName: string;
  issueId: string;
  identifier: string;
  title: string;
  url: string;
  changeKind: LinearWatcherChangeKind;
  summary: string;
  previousStatus?: string;
  currentStatus?: string;
  detectedAt: string;
};

export type LinearWatcherHeartbeatEvent = {
  type: "linear.watcher.heartbeat";
  timestamp: string;
};

export type LinearWatcherPollEvent = {
  type: "linear.watcher.poll";
  projectId: string;
  pollIntervalMs: number;
  polledAt: string;
  nextPollAt: string;
};

export type LinearWatcherStreamEvent = LinearWatcherChangeEvent | LinearWatcherHeartbeatEvent | LinearWatcherPollEvent;

export type WatcherDiffOptions = {
  statusChangesOnly?: boolean;
};

type WatcherSubscriber = (event: LinearWatcherStreamEvent) => void;

type ProjectRuntimeState = {
  projectId: string;
  projectName: string;
  nextPollAt: number;
  failureAttempts: number;
  baselineReady: boolean;
  snapshot: Map<string, WatcherIssueSnapshot>;
};

function normalizePollIntervalMs(value: number | undefined): number {
  const interval = value ?? DEFAULT_WATCHER_POLL_INTERVAL_MS;
  return Math.min(
    MAX_WATCHER_POLL_INTERVAL_MS,
    Math.max(MIN_WATCHER_POLL_INTERVAL_MS, Math.round(interval)),
  );
}

export function normalizeLinearProjectWatcherConfig(
  config: Partial<LinearProjectWatcherConfig> | undefined,
): LinearProjectWatcherConfig {
  return {
    enabled: config?.enabled ?? false,
    pollIntervalMs: normalizePollIntervalMs(config?.pollIntervalMs),
    statusChangesOnly: config?.statusChangesOnly ?? true,
    projectName: config?.projectName?.trim() || undefined,
  };
}

export function getLinearProjectWatchersMap(): LinearProjectWatchersMap {
  const settings = loadSettings();
  const raw = settings.linearProjectWatchers ?? {};
  const normalized: LinearProjectWatchersMap = {};
  for (const [projectId, config] of Object.entries(raw)) {
    normalized[projectId] = normalizeLinearProjectWatcherConfig(config);
  }
  return normalized;
}

export function getLinearProjectWatcherConfig(projectId: string): LinearProjectWatcherConfig {
  const map = getLinearProjectWatchersMap();
  return normalizeLinearProjectWatcherConfig(map[projectId]);
}

export function setLinearProjectWatcherConfig(
  projectId: string,
  config: Partial<LinearProjectWatcherConfig>,
): LinearProjectWatcherConfig {
  const trimmedProjectId = projectId.trim();
  if (!trimmedProjectId) {
    throw new Error("projectId is required");
  }

  const settings = loadSettings();
  const current = normalizeLinearProjectWatcherConfig(
    settings.linearProjectWatchers?.[trimmedProjectId],
  );
  const next = normalizeLinearProjectWatcherConfig({
    ...current,
    ...config,
  });

  settings.linearProjectWatchers = {
    ...(settings.linearProjectWatchers ?? {}),
    [trimmedProjectId]: next,
  };
  saveSettings(settings);
  return next;
}

export function issueToWatcherSnapshot(issue: LinearProjectIssue): WatcherIssueSnapshot {
  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    status: issue.status,
    stateId: issue.stateId,
    priority: issue.priority,
    assigneeName: issue.assigneeName,
    updatedAt: issue.updatedAt ?? null,
    url: issue.url,
  };
}

export function computeWatcherBackoffDelay(attempt: number): number {
  const normalizedAttempt = Math.max(1, attempt);
  return Math.min(10_000 * 2 ** (normalizedAttempt - 1), MAX_WATCHER_BACKOFF_MS);
}

function buildChangeSummary(
  changeKind: LinearWatcherChangeKind,
  current: WatcherIssueSnapshot,
  previous?: WatcherIssueSnapshot,
): string {
  switch (changeKind) {
    case "issue_created":
      return `New issue in ${current.status}`;
    case "status_changed":
      return `Status changed from ${previous?.status ?? "Unknown"} to ${current.status}`;
    case "assignee_changed":
      return `Assignee changed to ${current.assigneeName ?? "Unassigned"}`;
    case "priority_changed":
      return `Priority updated to ${current.priority}`;
    case "title_changed":
      return `Title updated`;
    default:
      return "Issue updated";
  }
}

function detectIssueChanges(
  previous: WatcherIssueSnapshot | undefined,
  current: WatcherIssueSnapshot,
  options: WatcherDiffOptions,
): LinearWatcherChangeKind[] {
  if (!previous) {
    return ["issue_created"];
  }

  const changes: LinearWatcherChangeKind[] = [];
  if (previous.status !== current.status || previous.stateId !== current.stateId) {
    changes.push("status_changed");
  }
  if (!options.statusChangesOnly) {
    if (previous.assigneeName !== current.assigneeName) {
      changes.push("assignee_changed");
    }
    if (previous.priority !== current.priority) {
      changes.push("priority_changed");
    }
    if (previous.title !== current.title) {
      changes.push("title_changed");
    }
    if (
      changes.length === 0 &&
      previous.updatedAt !== current.updatedAt
    ) {
      changes.push("updated");
    }
  }

  return changes;
}

export function diffWatcherSnapshots(
  previous: Map<string, WatcherIssueSnapshot>,
  currentIssues: WatcherIssueSnapshot[],
  options: WatcherDiffOptions,
): Array<{ changeKind: LinearWatcherChangeKind; issue: WatcherIssueSnapshot; previous?: WatcherIssueSnapshot }> {
  const results: Array<{
    changeKind: LinearWatcherChangeKind;
    issue: WatcherIssueSnapshot;
    previous?: WatcherIssueSnapshot;
  }> = [];

  for (const issue of currentIssues) {
    const previousIssue = previous.get(issue.id);
    const changeKinds = detectIssueChanges(previousIssue, issue, options);
    for (const changeKind of changeKinds) {
      results.push({ changeKind, issue, previous: previousIssue });
    }
  }

  return results;
}

class LinearWatcherOrchestrator {
  private subscribers = new Set<WatcherSubscriber>();
  private runtimeByProject = new Map<string, ProjectRuntimeState>();
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private polling = false;

  start(): void {
    if (this.tickTimer) return;
    this.tickTimer = setInterval(() => {
      void this.runTick();
    }, WATCHER_TICK_INTERVAL_MS);
  }

  stop(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  subscribe(subscriber: WatcherSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  notifyConfigChanged(): void {
    const enabledProjectIds = new Set(
      Object.entries(getLinearProjectWatchersMap())
        .filter(([, config]) => config.enabled)
        .map(([projectId]) => projectId),
    );

    for (const projectId of this.runtimeByProject.keys()) {
      if (!enabledProjectIds.has(projectId)) {
        this.runtimeByProject.delete(projectId);
      }
    }

    const now = Date.now();
    for (const projectId of enabledProjectIds) {
      const runtime = this.runtimeByProject.get(projectId);
      if (runtime) {
        runtime.nextPollAt = now;
      }
    }
  }

  private broadcast(event: LinearWatcherStreamEvent): void {
    for (const subscriber of this.subscribers) {
      subscriber(event);
    }
  }

  private getOrCreateRuntime(projectId: string, projectName: string): ProjectRuntimeState {
    const existing = this.runtimeByProject.get(projectId);
    if (existing) {
      if (projectName && existing.projectName !== projectName) {
        existing.projectName = projectName;
      }
      return existing;
    }

    const runtime: ProjectRuntimeState = {
      projectId,
      projectName,
      nextPollAt: Date.now(),
      failureAttempts: 0,
      baselineReady: false,
      snapshot: new Map(),
    };
    this.runtimeByProject.set(projectId, runtime);
    return runtime;
  }

  private async pollProject(projectId: string, config: LinearProjectWatcherConfig): Promise<void> {
    if (!getLinearAuthToken()) {
      return;
    }

    const runtime = this.getOrCreateRuntime(projectId, config.projectName ?? "Project");
    const result = await fetchLinearProjectIssues(projectId);
    const projectName =
      result.issues[0]?.projectName?.trim() ||
      config.projectName?.trim() ||
      runtime.projectName ||
      "Project";
    runtime.projectName = projectName;

    const currentIssues = result.issues.map(issueToWatcherSnapshot);
    if (!runtime.baselineReady) {
      runtime.snapshot = new Map(currentIssues.map((issue) => [issue.id, issue]));
      runtime.baselineReady = true;
      runtime.failureAttempts = 0;
      return;
    }

    const diffs = diffWatcherSnapshots(runtime.snapshot, currentIssues, {
      statusChangesOnly: config.statusChangesOnly,
    });

    runtime.snapshot = new Map(currentIssues.map((issue) => [issue.id, issue]));
    runtime.failureAttempts = 0;

    const detectedAt = new Date().toISOString();
    for (const diff of diffs) {
      this.broadcast({
        type: "linear.watcher.change",
        projectId,
        projectName,
        issueId: diff.issue.id,
        identifier: diff.issue.identifier,
        title: diff.issue.title,
        url: diff.issue.url,
        changeKind: diff.changeKind,
        summary: buildChangeSummary(diff.changeKind, diff.issue, diff.previous),
        previousStatus: diff.previous?.status,
        currentStatus: diff.issue.status,
        detectedAt,
      });
    }
  }

  private async runTick(): Promise<void> {
    if (this.polling) return;
    this.polling = true;

    try {
      if (!getLinearAuthToken()) {
        return;
      }

      const now = Date.now();
      const configs = getLinearProjectWatchersMap();

      for (const [projectId, config] of Object.entries(configs)) {
        if (!config.enabled) continue;

        const runtime = this.getOrCreateRuntime(projectId, config.projectName ?? "Project");
        if (now < runtime.nextPollAt) continue;

        try {
          await this.pollProject(projectId, config);
          const pollIntervalMs = normalizePollIntervalMs(config.pollIntervalMs);
          runtime.nextPollAt = now + pollIntervalMs;
          this.broadcast({
            type: "linear.watcher.poll",
            projectId,
            pollIntervalMs,
            polledAt: new Date(now).toISOString(),
            nextPollAt: new Date(runtime.nextPollAt).toISOString(),
          });
        } catch (error) {
          runtime.failureAttempts += 1;
          runtime.nextPollAt = now + computeWatcherBackoffDelay(runtime.failureAttempts);
          console.error("[linear-watcher] poll failed:", projectId, error);
        }
      }
    } finally {
      this.polling = false;
    }
  }
}

export const linearWatcherOrchestrator = new LinearWatcherOrchestrator();
