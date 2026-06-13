import type {
  AppSettings,
  AttachmentWireInput,
  ChatMessage,
  ExecutionMode,
  LinearIssueEntity,
  LinearIssueLinkMode,
  MarkdownFileEntity,
  MessageAttachment,
  ModelMode,
  RunViewModel,
  SidecarConnection,
  WhoopSnapshotEntity,
} from "../chat/types";
import type { LetterFilingOptions } from "../chat/letterFiling";
import type { ProjectDocumentEntity } from "./documentStatusGroups";
import {
  cachedRequest,
  DASHBOARD_CACHE_TTL_MS,
  HEALTH_CACHE_TTL_MS,
  invalidateRequestCache,
  REQUEST_CACHE_KEYS,
} from "./requestCache";

export {
  DASHBOARD_CACHE_TTL_MS,
  invalidateDashboardRequestCache,
  invalidateRequestCache,
  peekCached,
  REQUEST_CACHE_KEYS,
} from "./requestCache";

let connection: SidecarConnection = {
  baseUrl: import.meta.env.DEV ? "/api" : "http://127.0.0.1:3847",
  token: import.meta.env.VITE_SIDECAR_TOKEN ?? "dev-token-change-me",
};

export function setSidecarConnection(next: SidecarConnection) {
  connection = next;
}

export function getSidecarConnection(): SidecarConnection {
  return connection;
}

async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) {
    return `Request failed: ${response.status}`;
  }
  try {
    const body = JSON.parse(text) as { error?: string };
    return body.error ?? text;
  } catch {
    return text;
  }
}

const DEFAULT_REQUEST_TIMEOUT_MS = 8_000;
const HEALTH_REQUEST_TIMEOUT_MS = 8_000;
const SETTINGS_REQUEST_TIMEOUT_MS = 15_000;

export function formatSidecarReachabilityError(error: unknown): string {
  const message =
    error instanceof Error && error.name === "AbortError"
      ? "timed out"
      : error instanceof Error
        ? error.message
        : "failed";

  if (message.includes("Cannot reach agent server")) {
    return `${message} Start the agent server with \`npm run dev:all\` (browser) or \`npm run tauri:dev\` (desktop), then retry.`;
  }

  return `Cannot reach agent server at ${connection.baseUrl}: ${message}. Start the agent server with \`npm run dev:all\` (browser) or \`npm run tauri:dev\` (desktop), then retry.`;
}

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${connection.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${connection.token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    }, timeoutMs);
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "timed out"
        : error instanceof Error
          ? error.message
          : "failed";
    throw new Error(`Cannot reach agent server at ${connection.baseUrl}: ${message}`);
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const text = await response.text();
  if (!text) {
    throw new Error("Empty response from agent server");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Invalid response from agent server");
  }
}

export async function waitForSidecar(options?: {
  retries?: number;
  delayMs?: number;
  healthTimeoutMs?: number;
}): Promise<void> {
  const retries = options?.retries ?? 60;
  const delayMs = options?.delayMs ?? 250;
  const healthTimeoutMs = options?.healthTimeoutMs ?? HEALTH_REQUEST_TIMEOUT_MS;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      await getHealth(healthTimeoutMs);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(
    "Agent server did not start. Run `npm run tauri:dev` or restart the app, and check that Bun is installed.",
  );
}

export async function connectGoogleCalendar() {
  return request<{ authUrl: string; localUrl?: string }>("/integrations/google-calendar/connect", {
    method: "POST",
  });
}

export type IntegrationsStatus = {
  cursorApiKey: { configured: boolean; preview?: string };
  linearApiKey: { configured: boolean; preview?: string };
  geminiApiKey: { configured: boolean; preview?: string };
  googleCalendar: {
    credentialsConfigured: boolean;
    authenticated: boolean;
    clientId: { configured: boolean; preview?: string };
    clientSecret: { configured: boolean; preview?: string };
  };
  linear: {
    credentialsConfigured: boolean;
    authenticated: boolean;
    clientId: { configured: boolean; preview?: string };
    clientSecret: { configured: boolean; preview?: string };
  };
};

export async function getIntegrationsStatus() {
  return request<IntegrationsStatus>("/integrations/status");
}

export async function updateIntegrationSecrets(body: {
  cursorApiKey?: string | null;
  linearApiKey?: string | null;
  geminiApiKey?: string | null;
}) {
  return request<IntegrationsStatus>("/integrations/secrets", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function saveGoogleCalendarCredentials(body: {
  clientId?: string | null;
  clientSecret?: string | null;
  clear?: boolean;
}) {
  return request<IntegrationsStatus>("/integrations/google-calendar/credentials", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function saveLinearOAuthCredentials(body: {
  clientId?: string | null;
  clientSecret?: string | null;
  clear?: boolean;
}) {
  return request<IntegrationsStatus>("/integrations/linear/credentials", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function connectLinearOAuth() {
  return request<{ authUrl: string; localUrl: string }>("/integrations/linear/connect", {
    method: "POST",
  });
}

/** @deprecated Use saveGoogleCalendarCredentials with clientId/clientSecret fields */
export async function importGoogleCalendarCredentials(json: unknown) {
  return request<IntegrationsStatus>("/integrations/google-calendar/credentials", {
    method: "POST",
    body: JSON.stringify(json),
  });
}

export type IntegrationTestTarget =
  | "cursor"
  | "linear"
  | "gemini"
  | "googleCalendar"
  | "googleCalendarCredentials"
  | "linearOAuthCredentials";

export type IntegrationTestResult = {
  ok: boolean;
  message: string;
};

export type IntegrationTestCredentials = {
  cursorApiKey?: string;
  linearApiKey?: string;
  geminiApiKey?: string;
  googleOAuthClientId?: string;
  googleOAuthClientSecret?: string;
  linearOAuthClientId?: string;
  linearOAuthClientSecret?: string;
};

const INTEGRATION_TEST_TIMEOUT_MS = 20_000;

export async function runIntegrationTest(
  target: IntegrationTestTarget,
  credentials?: IntegrationTestCredentials,
): Promise<IntegrationTestResult> {
  return request<IntegrationTestResult>(
    "/integrations/test",
    {
      method: "POST",
      body: JSON.stringify({ target, ...credentials }),
    },
    INTEGRATION_TEST_TIMEOUT_MS,
  );
}

export async function getWhoopSetup() {
  return request<{ envPath: string; authCommand: string; docsUrl: string }>(
    "/integrations/whoop/setup",
    { method: "POST" },
  );
}

export async function fetchWhoopToday(options?: { force?: boolean }) {
  return cachedRequest(
    REQUEST_CACHE_KEYS.whoopToday,
    () =>
      request<{
        authenticated: boolean;
        snapshot: WhoopSnapshotEntity | null;
        error?: string;
      }>("/whoop/today"),
    { ttlMs: DASHBOARD_CACHE_TTL_MS, force: options?.force },
  );
}

export async function fetchWhoopDay(date: string, options?: { force?: boolean }) {
  const normalizedDate = date.trim();
  const query = new URLSearchParams({ date: normalizedDate });
  const key = `whoop-day:${normalizedDate}`;
  return cachedRequest(
    key,
    () =>
      request<{
        authenticated: boolean;
        snapshot: WhoopSnapshotEntity | null;
        error?: string;
      }>(`/whoop/day?${query.toString()}`),
    { ttlMs: DASHBOARD_CACHE_TTL_MS, force: options?.force },
  );
}

export async function fetchLinearToday(options?: { force?: boolean }) {
  return cachedRequest(
    REQUEST_CACHE_KEYS.linearToday,
    () =>
      request<{
        configured: boolean;
        dueDate: string;
        issues: LinearIssueEntity[];
        error?: string;
      }>("/linear/today"),
    { ttlMs: DASHBOARD_CACHE_TTL_MS, force: options?.force },
  );
}

export async function fetchLinearIssuesByDueDates(dueDates: string[]) {
  return request<{ issuesByDueDate: Record<string, LinearIssueEntity[]>; error?: string }>(
    "/linear/issues/by-due-dates",
    {
      method: "POST",
      body: JSON.stringify({ dueDates }),
    },
  );
}

export async function fetchLetterFilingOptions() {
  return request<LetterFilingOptions>("/letter/filing-options");
}

export async function fetchLetterPending(sessionId: string) {
  return request<{
    pending: { proposal: unknown; originalName: string } | null;
  }>(`/letter/pending/${encodeURIComponent(sessionId)}`);
}

export async function clearLetterPending(sessionId: string) {
  return request<{ ok: boolean }>(`/letter/pending/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
}

export async function fetchDeleteFilePending(sessionId: string) {
  return request<{
    pending: { path: string } | null;
  }>(`/delete-file/pending/${encodeURIComponent(sessionId)}`);
}

export async function clearDeleteFilePending(sessionId: string) {
  return request<{ ok: boolean }>(`/delete-file/pending/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
}

export async function respondDeleteFile(
  sessionId: string,
  action: "confirm" | "return",
) {
  return request<{ response: string; deleted?: string[] }>("/delete-file/respond", {
    method: "POST",
    body: JSON.stringify({ sessionId, action }),
  });
}

export async function fetchVaultDailyNoteToday(options?: { force?: boolean }) {
  return cachedRequest(
    REQUEST_CACHE_KEYS.vaultDailyNoteToday,
    () =>
      request<{
        note: {
          date: string;
          weekday: string;
          timezone: string;
          path: string;
          exists: boolean;
          created: boolean;
          content?: string;
        };
        stats: {
          sleep: number | null;
          recovery: number | null;
          strain: number | null;
          productivity: number | null;
        } | null;
        recentNotes: MarkdownFileEntity[];
        error?: string;
      }>("/vault/daily-note/today"),
    { ttlMs: DASHBOARD_CACHE_TTL_MS, force: options?.force },
  );
}

export async function ensureVaultDailyNoteToday() {
  const result = await request<{
    note: {
      date: string;
      weekday: string;
      timezone: string;
      path: string;
      exists: boolean;
      created: boolean;
    } | null;
    error?: string;
  }>("/vault/daily-note/today/ensure", { method: "POST" });

  if (result.note?.created) {
    invalidateRequestCache(REQUEST_CACHE_KEYS.vaultDailyNoteToday);
  }

  return result;
}

export async function runGoodMorningFlow() {
  return request<{
    prefetched: {
      linearIssues: LinearIssueEntity[];
      calendar: { events: unknown[] };
      whoop: WhoopSnapshotEntity | null;
      weather: { description: string; locationLabel: string; temperatureC?: number } | null;
      errors: Partial<Record<string, string>>;
    };
    dailyNoteUpdate: { path: string; lines: string[] } | null;
  }>("/flows/good-morning", { method: "POST" }, 120_000);
}

export async function submitGoodMorningFeel(answer: string) {
  return request<{
    polishedFeel: string;
    response: string;
    dailyNoteUpdate: { path: string; lines: string[] };
  }>("/flows/good-morning/feel", {
    method: "POST",
    body: JSON.stringify({ answer }),
  }, 120_000);
}

export async function runGoodNightFlow() {
  return request<{
    response: string;
    productivityScore: number | null;
    completedIssues: { count: number; issues: LinearIssueEntity[] };
    linear: { moved: LinearIssueEntity[]; tomorrowDate: string };
    whoop: WhoopSnapshotEntity | null;
    errors: Partial<Record<string, string>>;
  }>("/flows/good-night", { method: "POST" }, 120_000);
}

export async function submitGoodNightReflection(answers: string[]) {
  return request<{
    reflectionMarkdown: string;
    response: string;
    dailyNoteUpdate: { path: string; lines: string[] };
  }>("/flows/good-night/reflection", {
    method: "POST",
    body: JSON.stringify({ answers }),
  }, 180_000);
}

type HealthResponse = {
  ok: boolean;
  hasApiKey: boolean;
  hasGeminiApiKey: boolean;
  hasLinearApiKey: boolean;
  hasLinearOAuthCredentials: boolean;
  hasLinearOAuthAuth: boolean;
  hasGoogleCalendarCredentials: boolean;
  hasGoogleCalendarAuth: boolean;
  hasWhoopConfigured: boolean;
  hasWhoopAuth: boolean;
  sidecarRuntimeId?: string | null;
  sidecarVersion?: string | null;
  sidecarBuildId?: string | null;
};

async function fetchHealth(timeoutMs = HEALTH_REQUEST_TIMEOUT_MS): Promise<HealthResponse> {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${connection.baseUrl}/healthz`, undefined, timeoutMs);
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "timed out"
        : error instanceof Error
          ? error.message
          : "failed";
    throw new Error(`Cannot reach agent server at ${connection.baseUrl}: ${message}`);
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<HealthResponse>;
}

export async function getHealth(
  timeoutMsOrOptions: number | { timeoutMs?: number; force?: boolean } = HEALTH_REQUEST_TIMEOUT_MS,
): Promise<HealthResponse> {
  const timeoutMs =
    typeof timeoutMsOrOptions === "number"
      ? timeoutMsOrOptions
      : (timeoutMsOrOptions.timeoutMs ?? HEALTH_REQUEST_TIMEOUT_MS);
  const force = typeof timeoutMsOrOptions === "number" ? false : (timeoutMsOrOptions.force ?? false);

  return cachedRequest(REQUEST_CACHE_KEYS.health, () => fetchHealth(timeoutMs), {
    ttlMs: HEALTH_CACHE_TTL_MS,
    force,
  });
}

export async function getSettings() {
  return request<AppSettings>("/settings", undefined, SETTINGS_REQUEST_TIMEOUT_MS);
}

export async function ensureLinearIssueTerminalDirectory(options: {
  projectsPath: string;
  projectName: string;
  issueIdentifier: string;
}) {
  return request<{ path: string; folderName: string }>(
    "/workspace/issue-terminal-directory",
    {
      method: "POST",
      body: JSON.stringify(options),
    },
    SETTINGS_REQUEST_TIMEOUT_MS,
  );
}

export type VaultDirectoryEntry = {
  name: string;
  kind: "file" | "directory";
  path: string;
  date?: string | null;
  whoop?: {
    sleep: number | null;
    recovery: number | null;
    strain: number | null;
  } | null;
};

export type VaultDocumentContent = {
  path: string;
  title: string;
  body: string;
  date?: string | null;
  whoop?: {
    sleep: number | null;
    recovery: number | null;
    strain: number | null;
  } | null;
};

export async function listVaultDirectory(path: string) {
  const query = new URLSearchParams({ path });
  return request<{ path: string; entries: VaultDirectoryEntry[] }>(
    `/vault/entries?${query.toString()}`,
  );
}

export async function fetchVaultDocument(path: string) {
  const query = new URLSearchParams({ path });
  return request<{ document: VaultDocumentContent; error?: string }>(
    `/vault/documents?${query.toString()}`,
  );
}

export async function updateVaultDocument(
  path: string,
  updates: { title?: string; body?: string },
) {
  return request<{ document: VaultDocumentContent; error?: string }>("/vault/documents", {
    method: "PATCH",
    body: JSON.stringify({ path, ...updates }),
  });
}

export type WorkoutSetWire = {
  date: string;
  exercise: string;
  muscleGroup?: string;
  setNumber?: number;
  reps: number;
  weight: number;
  detail?: string;
  isBodyweight?: boolean;
  loggedAt?: string;
};

export type ExerciseCatalogEntryWire = {
  name: string;
  muscleGroup: string;
  aliases: string[];
};

export async function fetchWorkoutSets(options?: { from?: string; to?: string }) {
  const query = new URLSearchParams();
  if (options?.from) query.set("from", options.from);
  if (options?.to) query.set("to", options.to);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return request<{
    sets: WorkoutSetWire[];
    parseError: string | null;
    dateKeys: string[];
    error?: string;
  }>(`/vault/workouts/sets${suffix}`);
}

export async function fetchWorkoutDay(date: string) {
  return request<{
    date: string;
    sets: WorkoutSetWire[];
    parseError: string | null;
    error?: string;
  }>(`/vault/workouts/sets/${encodeURIComponent(date)}`);
}

export async function fetchWorkoutCatalog() {
  return request<{
    entries: ExerciseCatalogEntryWire[];
    markdown: string;
    error?: string;
  }>("/vault/workouts/catalog");
}

export async function appendWorkoutSets(sets: WorkoutSetWire[]) {
  return request<{ inserted: number; sets: WorkoutSetWire[]; error?: string }>(
    "/vault/workouts/sets",
    {
      method: "POST",
      body: JSON.stringify({ sets }),
    },
  );
}

export async function updateWorkoutSet(
  locator: { date: string; exercise: string; setNumber: number },
  patch: { reps: number; weight: number; isBodyweight: boolean },
) {
  return request<{ ok: boolean; error?: string }>("/vault/workouts/sets", {
    method: "PATCH",
    body: JSON.stringify({ ...locator, patch }),
  });
}

export async function deleteWorkoutSet(locator: {
  date: string;
  exercise: string;
  setNumber: number;
}) {
  return request<{ ok: boolean; error?: string }>("/vault/workouts/sets", {
    method: "DELETE",
    body: JSON.stringify(locator),
  });
}

export async function deleteWorkoutSession(date: string, sessionStartMs?: number) {
  return request<{ ok: boolean; error?: string }>("/vault/workouts/session", {
    method: "DELETE",
    body: JSON.stringify({ date, sessionStartMs }),
  });
}

export async function deleteWorkoutExercise(locator: { date: string; exercise: string }) {
  return request<{ ok: boolean; error?: string }>("/vault/workouts/exercise", {
    method: "DELETE",
    body: JSON.stringify(locator),
  });
}

export async function renameWorkoutExercise(
  locator: { date: string; exercise: string },
  newExercise: string,
) {
  return request<{ ok: boolean; error?: string }>("/vault/workouts/exercise/rename", {
    method: "POST",
    body: JSON.stringify({ ...locator, newExercise }),
  });
}

export async function ensureLinearWorkspaceVaultStructure(options: {
  teamId?: string;
  projectId?: string;
}) {
  return request<{ created: string[]; error?: string }>("/vault/linear-workspace-structure", {
    method: "POST",
    body: JSON.stringify(options),
  });
}

export type ProfileKind = "user" | "agent";

export async function getProfileContent(kind: ProfileKind) {
  return request<{ content: string }>(`/profiles/${kind}`);
}

export async function updateProfileContent(kind: ProfileKind, content: string) {
  return request<{ content: string }>(`/profiles/${kind}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
}

export type LinearProjectHealth = "onTrack" | "atRisk" | "offTrack";

export type LinearProjectSummary = {
  id: string;
  name: string;
  slugId?: string;
  icon?: string | null;
  priority?: number;
  priorityLabel?: string;
  startDate?: string | null;
  issueCount?: number;
  progress?: number;
  health?: LinearProjectHealth | null;
  status?: {
    id: string;
    name: string;
    type: string;
    position?: number;
  } | null;
};

export type LinearTeamSummary = {
  id: string;
  key: string;
  name: string;
};

export async function fetchLinearTeams() {
  return request<{ teams: LinearTeamSummary[]; error?: string }>("/linear/teams");
}

export async function fetchLinearProjectsPage(options: {
  query?: string;
  after?: string | null;
  first?: number;
} = {}) {
  const params = new URLSearchParams();
  if (options.query?.trim()) params.set("q", options.query.trim());
  if (options.after) params.set("after", options.after);
  if (options.first != null) params.set("first", String(options.first));

  const query = params.toString();
  return request<{
    projects: LinearProjectSummary[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  }>(`/linear/projects${query ? `?${query}` : ""}`);
}

export async function fetchLinearProjectById(projectId: string) {
  return request<{ project: LinearProjectSummary }>(
    `/linear/projects/${encodeURIComponent(projectId)}`,
  );
}

export type LinearProjectOverview = {
  id: string;
  name: string;
  icon: string | null;
  state: string;
  priority: number;
  priorityLabel: string;
  startDate: string | null;
  targetDate: string | null;
  leadName: string | null;
  leadAvatarUrl: string | null;
  summary: string | null;
  description: string | null;
  initiativeNames: string[];
};

export async function fetchLinearProjectOverview(projectId: string) {
  return request<{ overview: LinearProjectOverview | null; error?: string }>(
    `/linear/projects/${encodeURIComponent(projectId)}/overview`,
  );
}

export async function updateLinearProjectOverviewDescription(projectId: string, content: string) {
  return request<{ overview: LinearProjectOverview | null; error?: string }>(
    `/linear/projects/${encodeURIComponent(projectId)}/overview/description`,
    {
      method: "PATCH",
      body: JSON.stringify({ content }),
    },
  );
}

export async function fetchLinearProjectIssues(projectId: string) {
  return request<{
    issues: LinearIssueEntity[];
    workflowStates: { id: string; name: string; type: string; color?: string }[];
    error?: string;
  }>(
    `/linear/projects/${encodeURIComponent(projectId)}/issues`,
  );
}

export type LinearProjectWatcherConfig = {
  enabled: boolean;
  pollIntervalMs: number;
  statusChangesOnly: boolean;
  autoDispatchAgents?: boolean;
  dispatchStatuses?: string[];
  projectName?: string;
};

export type LinearProjectWatchersMap = Record<string, LinearProjectWatcherConfig>;

export async function fetchLinearProjectWatcherConfig(projectId: string) {
  return request<{ projectId: string; config: LinearProjectWatcherConfig; error?: string }>(
    `/linear/watchers/config/${encodeURIComponent(projectId)}`,
  );
}

export async function fetchLinearProjectWatchersConfig() {
  return request<{ watchers: LinearProjectWatchersMap; error?: string }>(
    "/linear/watchers/config",
  );
}

export async function updateLinearProjectWatcherConfig(
  projectId: string,
  updates: Partial<LinearProjectWatcherConfig>,
) {
  return request<{ projectId: string; config: LinearProjectWatcherConfig; error?: string }>(
    `/linear/watchers/config/${encodeURIComponent(projectId)}`,
    {
      method: "PUT",
      body: JSON.stringify(updates),
    },
  );
}

export type LinearIssueDetail = {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  url: string;
  status: string;
  stateId: string | null;
  stateType?: string;
  statusColor?: string;
  priority: number;
  priorityLabel: string;
  assigneeName: string | null;
  assigneeUsername: string | null;
  assigneeAvatarUrl: string | null;
  dueDate: string | null;
  estimate: number | null;
  branchName: string | null;
  projectId: string | null;
  projectName: string | null;
  labels: { id: string; name: string; color: string }[];
  availableLabels: { id: string; name: string; color: string }[];
  workflowStates: { id: string; name: string; type: string }[];
  teamEstimation: {
    issueEstimationType: string;
    issueEstimationAllowZero: boolean;
    issueEstimationExtended: boolean;
  } | null;
};

export async function fetchLinearIssueDetail(issueId: string) {
  return request<{ issue: LinearIssueDetail | null; error?: string }>(
    `/linear/issues/${encodeURIComponent(issueId)}`,
  );
}

export type LinearIssueDetailUpdates = {
  stateId?: string;
  priority?: number;
  estimate?: number | null;
  labelIds?: string[];
  description?: string | null;
};

export async function updateLinearIssueDetail(issueId: string, updates: LinearIssueDetailUpdates) {
  return request<{ issue: LinearIssueDetail | null; error?: string }>(
    `/linear/issues/${encodeURIComponent(issueId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    },
  );
}

export type LinearCommentAuthor = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type LinearCommentThreadSummary = {
  id: string;
  body: string;
  createdAt: string;
  author: LinearCommentAuthor;
};

export type LinearComment = {
  id: string;
  body: string;
  createdAt: string;
  author: LinearCommentAuthor;
  parentId: string | null;
};

export async function fetchLinearIssueCommentThreads(issueId: string) {
  return request<{ threads: LinearCommentThreadSummary[]; error?: string }>(
    `/linear/issues/${encodeURIComponent(issueId)}/comment-threads`,
  );
}

export async function fetchLinearIssueCommentThread(issueId: string, threadId: string) {
  return request<{
    viewerId: string | null;
    comments: LinearComment[];
    error?: string;
  }>(`/linear/issues/${encodeURIComponent(issueId)}/comment-threads/${encodeURIComponent(threadId)}`);
}

export async function createLinearIssueComment(
  issueId: string,
  options: { body?: string; parentId?: string; newThread?: boolean },
) {
  return request<{ comment: LinearComment; error?: string }>(
    `/linear/issues/${encodeURIComponent(issueId)}/comment-threads`,
    {
      method: "POST",
      body: JSON.stringify(options),
    },
  );
}

export async function fetchLinearProjectDocuments(projectId: string) {
  return request<{ documents: ProjectDocumentEntity[]; error?: string }>(
    `/linear/projects/${encodeURIComponent(projectId)}/documents`,
  );
}

export async function fetchLinearTeamDocuments(teamId: string) {
  return request<{ documents: ProjectDocumentEntity[]; error?: string }>(
    `/linear/teams/${encodeURIComponent(teamId)}/documents`,
  );
}

export async function createLinearProjectDocument(projectId: string) {
  return request<{ document: ProjectDocumentEntity | null; error?: string }>(
    `/linear/projects/${encodeURIComponent(projectId)}/documents`,
    { method: "POST" },
  );
}

export type LinearDocumentContent = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  projectName?: string;
};

export async function fetchLinearDocument(documentId: string) {
  return request<{ document: LinearDocumentContent | null; error?: string }>(
    `/linear/documents/${encodeURIComponent(documentId)}`,
  );
}

export async function updateLinearDocument(
  documentId: string,
  updates: { title?: string; content?: string; body?: string },
) {
  return request<{ document: LinearDocumentContent | null; error?: string }>(
    `/linear/documents/${encodeURIComponent(documentId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    },
  );
}

export async function deleteLinearDocument(documentId: string) {
  return request<{ ok: boolean; error?: string }>(
    `/linear/documents/${encodeURIComponent(documentId)}`,
    { method: "DELETE" },
  );
}

export type CursorModelSummary = {
  id: string;
  displayName: string;
  aliases?: string[];
};

export async function fetchCursorModels() {
  return request<{ models: CursorModelSummary[] }>("/integrations/cursor/models");
}

export async function updateSettings(updates: {
  notesPath?: string;
  vaultName?: string | null;
  projectsPath?: string | null;
  modelMode?: ModelMode;
  executionMode?: ExecutionMode;
  autoModelId?: string | null;
  maxModelId?: string | null;
  issueLinkMode?: LinearIssueLinkMode;
  groceryLinearProjectId?: string | null;
}) {
  return request<{
    notesPath: string | null;
    vaultName: string | null;
    projectsPath: string | null;
    agentId: string | null;
    modelMode: ModelMode;
    modelId: string;
    autoModelId: string | null;
    maxModelId: string | null;
    modelName: string;
    executionMode: ExecutionMode;
    issueLinkMode: LinearIssueLinkMode;
    groceryLinearProjectId: string | null;
  }>("/settings", {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export interface SessionSummaryResponse {
  sessionId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface SessionListResponse {
  activeSessionId: string | null;
  sessions: SessionSummaryResponse[];
}

export interface SessionRecordResponse extends SessionSummaryResponse {
  agentId: string;
  notesPath: string;
  messages: ChatMessage[];
  runs: Record<string, RunViewModel>;
}

export interface DeleteSessionResponse {
  activeSessionId: string | null;
  createdSession: SessionRecordResponse | null;
}

export async function listSessions() {
  return request<SessionListResponse>("/sessions");
}

export async function getSessionState(sessionId: string) {
  return request<SessionRecordResponse>(
    `/sessions/${encodeURIComponent(sessionId)}`,
  );
}

export async function createSession() {
  return request<SessionRecordResponse>("/sessions", { method: "POST", body: "{}" });
}

export async function deleteSession(sessionId: string) {
  return request<DeleteSessionResponse>(
    `/sessions/${encodeURIComponent(sessionId)}`,
    { method: "DELETE" },
  );
}

export async function saveSessionState(
  sessionId: string,
  state: { messages: ChatMessage[]; runs: Record<string, RunViewModel> },
) {
  return request<{ ok: boolean }>(
    `/sessions/${encodeURIComponent(sessionId)}/state`,
    {
      method: "PUT",
      body: JSON.stringify(state),
    },
    10_000,
  );
}

export async function setActiveSession(sessionId: string) {
  return request<{ activeSessionId: string | null }>(
    `/sessions/${encodeURIComponent(sessionId)}/active`,
    { method: "PUT", body: "{}" },
  );
}

export async function updateSessionTitle(sessionId: string, title: string) {
  return request<{ title: string }>(
    `/sessions/${encodeURIComponent(sessionId)}/title`,
    {
      method: "PUT",
      body: JSON.stringify({ title }),
    },
  );
}

export async function clearSessionChat(sessionId: string) {
  return request<{ ok: boolean; title: string }>(
    `/sessions/${encodeURIComponent(sessionId)}/clear`,
    { method: "POST", body: "{}" },
  );
}

import type { ToolPinSelection } from "../chat/tool-routing";
import type { ChatFocusContext } from "./chatFocusContext";

export async function sendMessage(
  sessionId: string,
  text: string,
  attachments?: AttachmentWireInput[],
  toolPins?: ToolPinSelection,
  quickActionId?: string,
  options?: { captureTime?: string; groceryWeek?: string; focusContext?: ChatFocusContext | null },
) {
  return request<{ runId: string; attachments?: MessageAttachment[] }>(
    `/sessions/${encodeURIComponent(sessionId)}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        text,
        attachments,
        toolPins: toolPins && Object.keys(toolPins).length > 0 ? toolPins : undefined,
        quickActionId,
        captureTime: options?.captureTime,
        groceryWeek: options?.groceryWeek,
        focusContext: options?.focusContext ?? undefined,
      }),
    },
    120_000,
  );
}

export async function respondApproval(approvalId: string, approved: boolean) {
  return request<{ ok: boolean }>(`/approvals/${approvalId}/respond`, {
    method: "POST",
    body: JSON.stringify({ approved }),
  });
}

export async function cancelRun(runId: string) {
  return request<{ ok: boolean }>(`/runs/${encodeURIComponent(runId)}/cancel`, {
    method: "POST",
    body: "{}",
  });
}

export async function getWorkspaceDiff() {
  return request<{ diff: string }>("/workspace/diff");
}

export async function revertWorkspace() {
  return request<{ ok: boolean }>("/workspace/revert", { method: "POST", body: "{}" });
}

export function eventsUrl(sessionId: string, runId: string) {
  return `${connection.baseUrl}/sessions/${encodeURIComponent(sessionId)}/events?runId=${encodeURIComponent(runId)}`;
}

export function getAuthHeader() {
  return `Bearer ${connection.token}`;
}
