import {
  fetchLinearProjectWatcherConfig,
  type LinearProjectWatcherConfig,
} from "./api";
import type { LinearWatcherChangeEvent } from "./notificationPayloads";
import { appendTerminalAgentActivityLog } from "./linearWatcherActivityLog";
import { isTauriRuntime } from "./tauriRuntime";
import { addLinearWatcherStreamListener } from "./linearWatcherEvents";
import { resolveTerminalLeafId } from "../modules/terminal/leafId";
import {
  isLeafAgentActive,
  isLeafSessionActive,
  whenSessionReady,
  writeToSession,
} from "../modules/terminal/lib/useTerminalSession";
import { registerTerminalAgentLogContext } from "./terminalAgentActivityLog";

const DISPATCH_POST_READY_DELAY_MS = 500;
const DISPATCH_SESSION_READY_TIMEOUT_MS = 12_000;

export type LinearIssueDispatchJob = {
  projectId: string;
  projectName: string;
  issueId: string;
  identifier: string;
  title: string;
  status: string;
  dispatchedAt: string;
  dispatchKey: string;
};

export function canonicalWatcherStatusKey(status: string | undefined): string | null {
  const trimmed = status?.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

export function statusMatchesDispatchList(
  status: string | undefined,
  dispatchStatuses: string[],
): boolean {
  const key = canonicalWatcherStatusKey(status);
  if (!key || dispatchStatuses.length === 0) return false;
  return dispatchStatuses.some(
    (candidate) => canonicalWatcherStatusKey(candidate) === key,
  );
}

export function buildIssueDispatchKey(issueId: string, status: string): string {
  return `${issueId}:${canonicalWatcherStatusKey(status) ?? status.trim()}`;
}

export function shouldDispatchAgentForWatcherChange(
  event: LinearWatcherChangeEvent,
  config: LinearProjectWatcherConfig,
): boolean {
  if (!config.enabled || !config.autoDispatchAgents) return false;
  if ((config.dispatchStatuses?.length ?? 0) === 0) return false;

  const dispatchStatuses = config.dispatchStatuses ?? [];
  const currentStatus = event.currentStatus;
  if (!statusMatchesDispatchList(currentStatus, dispatchStatuses)) {
    return false;
  }

  if (event.changeKind === "issue_created") {
    return true;
  }

  if (event.changeKind !== "status_changed") {
    return false;
  }

  return !statusMatchesDispatchList(event.previousStatus, dispatchStatuses);
}

export function buildAutoDispatchShellCommand(job: LinearIssueDispatchJob): string {
  const prompt = [
    `You are working on Linear issue ${job.identifier}: ${job.title}.`,
    "Write a file DISPATCH_OK.md in the current directory with the issue identifier, title, and ISO timestamp.",
    "Do not modify anything else. Stop when done.",
  ].join(" ");
  const escaped = prompt.replace(/'/g, `'\\''`);
  return `cursor agent -p '${escaped}'`;
}

const dispatchedKeys = new Set<string>();
const activeJobs = new Map<string, LinearIssueDispatchJob>();
const injectedJobKeys = new Set<string>();
const jobListeners = new Set<(jobs: LinearIssueDispatchJob[]) => void>();

function notifyJobListeners(): void {
  const snapshot = [...activeJobs.values()];
  for (const listener of jobListeners) {
    listener(snapshot);
  }
}

export function subscribeLinearIssueDispatchJobs(
  listener: (jobs: LinearIssueDispatchJob[]) => void,
): () => void {
  jobListeners.add(listener);
  listener([...activeJobs.values()]);
  return () => jobListeners.delete(listener);
}

export function getActiveLinearIssueDispatchJobs(): LinearIssueDispatchJob[] {
  return [...activeJobs.values()];
}

export async function injectDispatchCommandForJob(job: LinearIssueDispatchJob): Promise<void> {
  if (injectedJobKeys.has(job.dispatchKey)) return;
  injectedJobKeys.add(job.dispatchKey);

  const leafId = resolveTerminalLeafId(job.issueId);

  registerTerminalAgentLogContext(leafId, {
    issueId: job.issueId,
    identifier: job.identifier,
    title: job.title,
    projectId: job.projectId,
    projectName: job.projectName,
    issueStatus: job.status,
  });

  appendTerminalAgentActivityLog({
    projectId: job.projectId,
    projectName: job.projectName,
    issueId: job.issueId,
    identifier: job.identifier,
    title: job.title,
    summary: "Auto-dispatch started Cursor agent in issue terminal",
    agentState: "working",
    detectedAt: job.dispatchedAt,
    issueStatus: job.status,
  });

  await whenSessionReady(leafId, DISPATCH_SESSION_READY_TIMEOUT_MS);
  await new Promise((resolve) => setTimeout(resolve, DISPATCH_POST_READY_DELAY_MS));

  const command = buildAutoDispatchShellCommand(job);
  if (!writeToSession(leafId, `${command}\r`)) {
    appendTerminalAgentActivityLog({
      projectId: job.projectId,
      projectName: job.projectName,
      issueId: job.issueId,
      identifier: job.identifier,
      title: job.title,
      summary: "Auto-dispatch failed: could not write to terminal session",
      agentState: "exited",
      detectedAt: new Date().toISOString(),
      issueStatus: job.status,
    });
  }
}

export async function dispatchAgentForWatcherChange(
  event: LinearWatcherChangeEvent,
): Promise<boolean> {
  if (!isTauriRuntime()) return false;

  const configResult = await fetchLinearProjectWatcherConfig(event.projectId);
  const config = configResult.config;
  if (!config || configResult.error) return false;
  if (!shouldDispatchAgentForWatcherChange(event, config)) return false;

  const currentStatus = event.currentStatus?.trim();
  if (!currentStatus) return false;

  const dispatchKey = buildIssueDispatchKey(event.issueId, currentStatus);
  if (dispatchedKeys.has(dispatchKey)) return false;

  const leafId = resolveTerminalLeafId(event.issueId);
  if (isLeafSessionActive(leafId) && isLeafAgentActive(leafId)) {
    return false;
  }

  dispatchedKeys.add(dispatchKey);

  const job: LinearIssueDispatchJob = {
    projectId: event.projectId,
    projectName: event.projectName,
    issueId: event.issueId,
    identifier: event.identifier,
    title: event.title,
    status: currentStatus,
    dispatchedAt: new Date().toISOString(),
    dispatchKey,
  };

  activeJobs.set(event.issueId, job);
  notifyJobListeners();
  return true;
}

export function startLinearIssueAgentDispatch(): () => void {
  return addLinearWatcherStreamListener((event) => {
    if (event.type !== "linear.watcher.change") return;
    void dispatchAgentForWatcherChange(event);
  });
}

/** Test helper — reset in-memory dispatch bookkeeping. */
export function resetLinearIssueAgentDispatchStateForTests(): void {
  dispatchedKeys.clear();
  activeJobs.clear();
  injectedJobKeys.clear();
  notifyJobListeners();
}
