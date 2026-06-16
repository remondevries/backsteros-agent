import type {
  AccountWorkspaceResponse,
  AppSettings,
  AttachmentWireInput,
  ChatMessage,
  DeleteAccountResponse,
  AdminUserAccountsResponse,
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
import type { LinearAgentSessionSnapshot } from "./linearAgentSessionTypes";
import type { ProjectDocumentEntity } from "./documentStatusGroups";
import { notifyLinearSessionExpired } from "./linearSessionExpired";
import {
  cachedRequest,
  cacheKeyLinearIssues,
  cacheKeyLinearMeetingDocuments,
  cacheKeyLinearOverview,
  cacheKeyLinearProjectDocuments,
  cacheKeyLinearTeamDocuments,
  cacheKeyLinearTeamIssues,
  cacheKeyLinearTeamProjects,
  cacheKeyVaultDirectory,
  cacheKeyVaultDocument,
  DASHBOARD_CACHE_TTL_MS,
  HEALTH_CACHE_TTL_MS,
  invalidateLinearContentListCaches,
  invalidateRequestCache,
  invalidateVaultContentCaches,
  LINEAR_ISSUES_CACHE_TTL_MS,
  LINEAR_LIST_CACHE_TTL_MS,
  LINEAR_PROJECT_CACHE_TTL_MS,
  peekCached,
  REQUEST_CACHE_KEYS,
  SETTINGS_CACHE_TTL_MS,
  VAULT_LIST_CACHE_TTL_MS,
} from "./requestCache";

export {
  DASHBOARD_CACHE_TTL_MS,
  invalidateDashboardRequestCache,
  invalidateLinearContentListCaches,
  invalidateRequestCache,
  invalidateVaultContentCaches,
  peekCached,
  REQUEST_CACHE_KEYS,
} from "./requestCache";

let connection: SidecarConnection = {
  baseUrl: import.meta.env.DEV ? "/api" : "",
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
  if (response.status === 401) {
    return "Unauthorized — sign in with your server access token first.";
  }
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
const LINEAR_LIST_REQUEST_TIMEOUT_MS = 30_000;
const HEALTH_REQUEST_TIMEOUT_MS = 8_000;
const SETTINGS_REQUEST_TIMEOUT_MS = 15_000;

function linearListQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

function sidecarConnectionHint(baseUrl: string, message: string): string {
  if (message.includes("npm run")) {
    return "";
  }
  if (baseUrl === "/api") {
    return "Start the full dev stack: `npm run dev` (or `npm run dev:web`).";
  }
  if (/127\.0\.0\.1:3847|localhost:3847/.test(baseUrl)) {
    return "Restart the app or run `npm run tauri:dev`.";
  }
  if (!baseUrl) {
    return "The server at this URL is not responding; check the deployment process.";
  }
  if (/^https:\/\//.test(baseUrl)) {
    return "Check BACKSTER_SERVER_URL in ~/.backsteros-agent/.env and that staging allows desktop origins (redeploy if needed).";
  }
  return "Start the agent server with `npm run dev` (browser) or `npm run tauri:dev` (desktop), then retry.";
}

export function formatSidecarReachabilityError(error: unknown): string {
  const message =
    error instanceof Error && error.name === "AbortError"
      ? "timed out"
      : error instanceof Error
        ? error.message
        : "failed";

  if (message.includes("Agent server is starting") || message.includes("Retry shortly")) {
    return "Agent server is starting. Waiting for the sidecar on port 3847…";
  }

  const baseUrl = connection.baseUrl;
  const hint = sidecarConnectionHint(baseUrl, message);

  if (message.includes("Cannot reach agent server")) {
    const colonIndex = message.indexOf(":");
    const detail = colonIndex >= 0 ? message.slice(colonIndex + 1).trim() : message;
    return hint ? `${detail}. ${hint}` : detail;
  }

  if (message.includes("Agent server did not")) {
    return hint ? `${message}. ${hint}` : message;
  }

  const prefix = `Cannot reach agent server at ${baseUrl || "this origin"}: ${message}`;
  return hint ? `${prefix}. ${hint}` : prefix;
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
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (connection.token) {
    headers.Authorization = `Bearer ${connection.token}`;
  }

  try {
    response = await fetchWithTimeout(`${connection.baseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers,
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
    const message = await readErrorMessage(response);
    notifyLinearSessionExpired(message);
    throw new Error(message);
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
  throw new Error("Agent server did not become healthy");
}

export async function connectGoogleCalendar() {
  return request<{ authUrl: string; localUrl?: string }>("/integrations/google-calendar/connect", {
    method: "POST",
  });
}

export type IntegrationsStatus = {
  cursorApiKey: { configured: boolean; preview?: string };
  geminiApiKey: { configured: boolean; preview?: string };
  googleCalendar: {
    credentialsConfigured: boolean;
    authenticated: boolean;
    clientId: { configured: boolean; preview?: string };
    clientSecret: { configured: boolean; preview?: string };
  };
  linear: {
    credentialsConfigured: boolean;
    credentialsFromEnv: boolean;
    authenticated: boolean;
    clientId: { configured: boolean; preview?: string };
    clientSecret: { configured: boolean; preview?: string };
  };
  whoop: {
    configured: boolean;
    authenticated: boolean;
    envPath: string;
  };
};

export async function getIntegrationsStatus() {
  return request<IntegrationsStatus>("/integrations/status");
}

export async function updateIntegrationSecrets(body: {
  cursorApiKey?: string | null;
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

export async function disconnectLinearOAuth() {
  return request<IntegrationsStatus>("/integrations/linear/disconnect", {
    method: "POST",
  });
}

export async function connectLinearOAuth(options?: { appReturnUrl?: string }) {
  return request<{ authUrl: string; localUrl: string }>("/integrations/linear/connect", {
    method: "POST",
    body: JSON.stringify(options ?? {}),
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

export async function saveWhoopCredentials(body: {
  email?: string | null;
  iosBearerToken?: string | null;
  cognitoRefreshToken?: string | null;
  userId?: string | null;
  installationId?: string | null;
  clear?: boolean;
}) {
  return request<IntegrationsStatus>("/integrations/whoop/credentials", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getWhoopSetup() {
  return request<{ envPath: string; docsUrl: string }>("/integrations/whoop/setup", {
    method: "POST",
  });
}

export type WhoopAuthStartResult =
  | { status: "connected" }
  | { status: "mfa_required"; authSessionId: string; challengeName: string };

export async function startWhoopAuth(email: string, password: string) {
  return request<WhoopAuthStartResult>("/integrations/whoop/auth", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function completeWhoopAuthMfa(authSessionId: string, code: string) {
  return request<{ status: "connected" }>("/integrations/whoop/auth/mfa", {
    method: "POST",
    body: JSON.stringify({ authSessionId, code }),
  });
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

export type HealthResponse = {
  ok: boolean;
  hasApiKey: boolean;
  cursorApiKeyValid?: boolean | null;
  hasGeminiApiKey: boolean;
  hasLinearOAuthCredentials: boolean;
  hasLinearOAuthAuth: boolean;
  hasGoogleCalendarCredentials: boolean;
  hasGoogleCalendarAuth: boolean;
  hasWhoopConfigured: boolean;
  hasWhoopAuth: boolean;
  vaultEnabled?: boolean;
  productMode?: "linear" | "full";
  staticUiAvailable?: boolean;
  requiresServerAccessAuth?: boolean;
  sidecarRuntimeId?: string | null;
  sidecarVersion?: string | null;
  sidecarBuildId?: string | null;
  appBuildSha?: string | null;
};

export async function getAuthStatus(): Promise<{
  authenticated: boolean;
  requiresServerAccessAuth?: boolean;
}> {
  const response = await fetchWithTimeout(`${connection.baseUrl}/auth/status`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<{ authenticated: boolean }>;
}

export async function loginWithAccessToken(accessToken: string): Promise<void> {
  const response = await fetchWithTimeout(`${connection.baseUrl}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: accessToken }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  setSidecarConnection({
    baseUrl: connection.baseUrl,
    token: "",
  });
}

export async function logoutSession(): Promise<void> {
  await fetchWithTimeout(`${connection.baseUrl}/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => undefined);
  setSidecarConnection({
    baseUrl: connection.baseUrl,
    token: import.meta.env.VITE_SIDECAR_TOKEN ?? "",
  });
}

async function fetchHealth(timeoutMs = HEALTH_REQUEST_TIMEOUT_MS): Promise<HealthResponse> {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${connection.baseUrl}/healthz`, {
      credentials: "include",
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

export async function getSettings(options?: { force?: boolean }) {
  return cachedRequest(
    REQUEST_CACHE_KEYS.settings,
    () => request<AppSettings>("/settings", undefined, SETTINGS_REQUEST_TIMEOUT_MS),
    { ttlMs: SETTINGS_CACHE_TTL_MS, force: options?.force },
  );
}

/** Synchronous read of cached settings when still within TTL (avoids redundant fetches). */
export function peekCachedSettings(): AppSettings | null {
  return peekCached<AppSettings>(REQUEST_CACHE_KEYS.settings, SETTINGS_CACHE_TTL_MS);
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

export async function listVaultDirectory(
  path: string,
  options?: { force?: boolean; flatten?: boolean; enrich?: "none" | "whoop" },
) {
  const query = new URLSearchParams({ path });
  if (options?.flatten) query.set("flatten", "true");
  if (options?.enrich) query.set("enrich", options.enrich);
  return cachedRequest(
    `${cacheKeyVaultDirectory(path)}${options?.flatten ? ":flat" : ""}${options?.enrich ? `:${options.enrich}` : ""}`,
    () =>
      request<{ path: string; entries: VaultDirectoryEntry[] }>(
        `/vault/entries?${query.toString()}`,
      ),
    { ttlMs: VAULT_LIST_CACHE_TTL_MS, force: options?.force },
  );
}

export async function fetchVaultDocument(path: string, options?: { force?: boolean }) {
  const query = new URLSearchParams({ path });
  return cachedRequest(
    cacheKeyVaultDocument(path),
    () =>
      request<{ document: VaultDocumentContent; error?: string }>(
        `/vault/documents?${query.toString()}`,
      ),
    { ttlMs: VAULT_LIST_CACHE_TTL_MS, force: options?.force },
  );
}

export async function updateVaultDocument(
  path: string,
  updates: { title?: string; body?: string },
) {
  const result = await request<{ document: VaultDocumentContent; error?: string }>(
    "/vault/documents",
    {
      method: "PATCH",
      body: JSON.stringify({ path, ...updates }),
    },
  );
  invalidateVaultContentCaches();
  invalidateRequestCache(cacheKeyVaultDocument(path));
  return result;
}

export async function createVaultDocument(folder: string, title?: string) {
  const result = await request<{ document: VaultDocumentContent; error?: string }>(
    "/vault/documents",
    {
      method: "POST",
      body: JSON.stringify({ folder, ...(title ? { title } : {}) }),
    },
  );
  invalidateVaultContentCaches();
  return result;
}

export async function deleteVaultDocument(path: string) {
  const result = await request<{ deleted: string[]; error?: string }>("/vault/documents", {
    method: "DELETE",
    body: JSON.stringify({ path }),
  });
  invalidateVaultContentCaches();
  invalidateRequestCache(cacheKeyVaultDocument(path));
  return result;
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

export type LinearCustomerSummary = {
  id: string;
  name: string;
  slugId?: string;
  url?: string;
  domains: string[];
};

export async function fetchLinearTeamsPage(options: {
  after?: string | null;
  first?: number;
} = {}) {
  const params = new URLSearchParams();
  if (options.after) params.set("after", options.after);
  if (options.first != null) params.set("first", String(options.first));

  const query = params.toString();
  return request<{
    teams: LinearTeamSummary[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    error?: string;
  }>(`/linear/teams${query ? `?${query}` : ""}`);
}

function mergeLinearTeamPages(
  current: LinearTeamSummary[],
  incoming: LinearTeamSummary[],
): LinearTeamSummary[] {
  const seen = new Set(current.map((team) => team.id));
  const next = [...current];
  for (const team of incoming) {
    if (seen.has(team.id)) continue;
    seen.add(team.id);
    next.push(team);
  }
  return next;
}

/** Paginates through all Linear teams with client cache + inflight dedup. */
export async function fetchAllLinearTeams(options?: { force?: boolean }) {
  return cachedRequest(
    REQUEST_CACHE_KEYS.linearTeams,
    async () => {
      let after: string | null = null;
      let loaded: LinearTeamSummary[] = [];

      for (;;) {
        const page = await fetchLinearTeamsPage({
          after: after ?? undefined,
          first: 50,
        });
        if (page.error) {
          return { teams: loaded, error: page.error };
        }
        loaded = mergeLinearTeamPages(loaded, page.teams);
        if (!page.pageInfo.hasNextPage || !page.pageInfo.endCursor) break;
        after = page.pageInfo.endCursor;
      }

      loaded.sort((left, right) => left.name.localeCompare(right.name));
      return { teams: loaded };
    },
    { ttlMs: DASHBOARD_CACHE_TTL_MS, force: options?.force },
  );
}

export async function fetchLinearTeams(options?: { force?: boolean }) {
  return fetchAllLinearTeams(options);
}

export async function fetchLinearCustomersPage(options: {
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
    customers: LinearCustomerSummary[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    error?: string;
  }>(`/linear/customers${query ? `?${query}` : ""}`);
}

function mergeLinearCustomerPages(
  current: LinearCustomerSummary[],
  incoming: LinearCustomerSummary[],
): LinearCustomerSummary[] {
  const seen = new Set(current.map((customer) => customer.id));
  const next = [...current];
  for (const customer of incoming) {
    if (seen.has(customer.id)) continue;
    seen.add(customer.id);
    next.push(customer);
  }
  return next;
}

/** Paginates through all Linear customers with client cache + inflight dedup. */
export async function fetchAllLinearCustomers(options?: { force?: boolean; query?: string }) {
  return cachedRequest(
    options?.query?.trim()
      ? `${REQUEST_CACHE_KEYS.linearCustomersAll}:${options.query.trim().toLocaleLowerCase()}`
      : REQUEST_CACHE_KEYS.linearCustomersAll,
    async () => {
      let after: string | null = null;
      let loaded: LinearCustomerSummary[] = [];

      for (;;) {
        const page = await fetchLinearCustomersPage({
          query: options?.query,
          after: after ?? undefined,
          first: 50,
        });
        if (page.error) {
          return { customers: loaded, error: page.error };
        }
        loaded = mergeLinearCustomerPages(loaded, page.customers);
        if (!page.pageInfo.hasNextPage || !page.pageInfo.endCursor) break;
        after = page.pageInfo.endCursor;
      }

      loaded.sort((left, right) => left.name.localeCompare(right.name));
      return { customers: loaded };
    },
    { ttlMs: DASHBOARD_CACHE_TTL_MS, force: options?.force },
  );
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

function mergeLinearProjectPages(
  current: LinearProjectSummary[],
  incoming: LinearProjectSummary[],
): LinearProjectSummary[] {
  const seen = new Set(current.map((project) => project.id));
  const next = [...current];
  for (const project of incoming) {
    if (seen.has(project.id)) continue;
    seen.add(project.id);
    next.push(project);
  }
  return next;
}

/** Paginates through all Linear projects with client cache + inflight dedup. */
export async function fetchAllLinearProjects(options?: { force?: boolean }) {
  return cachedRequest(
    REQUEST_CACHE_KEYS.linearProjectsAll,
    async () => {
      let after: string | null = null;
      let loaded: LinearProjectSummary[] = [];

      for (;;) {
        const page = await fetchLinearProjectsPage({
          after: after ?? undefined,
          first: 50,
        });
        loaded = mergeLinearProjectPages(loaded, page.projects);
        if (!page.pageInfo.hasNextPage || !page.pageInfo.endCursor) break;
        after = page.pageInfo.endCursor;
      }

      return { projects: loaded };
    },
    { ttlMs: DASHBOARD_CACHE_TTL_MS, force: options?.force },
  );
}

export type LinearProjectStatusSummary = {
  id: string;
  name: string;
  type: string;
  position?: number;
  color?: string;
};

export async function fetchLinearProjectStatuses(options?: { force?: boolean }) {
  return cachedRequest(
    REQUEST_CACHE_KEYS.linearProjectStatuses,
    () => request<{ statuses: LinearProjectStatusSummary[]; error?: string }>("/linear/project-statuses"),
    { ttlMs: LINEAR_PROJECT_CACHE_TTL_MS, force: options?.force },
  );
}

export async function searchLinearIssues(term: string, options: { limit?: number } = {}) {
  const params = new URLSearchParams();
  params.set("q", term.trim());
  if (options.limit != null) params.set("limit", String(options.limit));
  const query = params.toString();
  return request<{ issues: LinearIssueEntity[]; error?: string }>(
    `/linear/issues/search?${query}`,
  );
}

export type LinearSearchDocumentEntity = {
  id: string;
  title: string;
  projectId?: string;
  projectName?: string;
};

export async function searchLinearDocuments(term: string, options: { limit?: number } = {}) {
  const params = new URLSearchParams();
  params.set("q", term.trim());
  if (options.limit != null) params.set("limit", String(options.limit));
  const query = params.toString();
  return request<{ documents: LinearSearchDocumentEntity[]; error?: string }>(
    `/linear/documents/search?${query}`,
  );
}

export type VaultSearchIndexEntry = {
  path: string;
  title: string;
  folder: string;
};

export async function fetchVaultSearchIndex(options?: { force?: boolean }) {
  return cachedRequest(
    REQUEST_CACHE_KEYS.vaultSearchIndex,
    () => request<{ entries: VaultSearchIndexEntry[]; error?: string }>("/vault/search-index"),
    { ttlMs: DASHBOARD_CACHE_TTL_MS, force: options?.force },
  );
}

export async function fetchLinearProjectById(projectId: string) {
  return request<{ project: LinearProjectSummary }>(
    `/linear/projects/${encodeURIComponent(projectId)}`,
  );
}

export type LinearProjectContextSummary = {
  projectId: string;
  projectName: string;
  teamId: string;
  teamName: string | null;
};

export async function fetchLinearProjectContext(projectId: string) {
  return request<{ context: LinearProjectContextSummary | null; error?: string }>(
    `/linear/projects/${encodeURIComponent(projectId)}/context`,
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

export async function fetchLinearProjectOverview(projectId: string, options?: { force?: boolean }) {
  return cachedRequest(
    cacheKeyLinearOverview(projectId),
    () =>
      request<{ overview: LinearProjectOverview | null; error?: string }>(
        `/linear/projects/${encodeURIComponent(projectId)}/overview`,
      ),
    { ttlMs: LINEAR_PROJECT_CACHE_TTL_MS, force: options?.force },
  );
}

export async function updateLinearProjectOverviewDescription(projectId: string, content: string) {
  const result = await request<{ overview: LinearProjectOverview | null; error?: string }>(
    `/linear/projects/${encodeURIComponent(projectId)}/overview/description`,
    {
      method: "PATCH",
      body: JSON.stringify({ content }),
    },
  );
  invalidateRequestCache(cacheKeyLinearOverview(projectId));
  return result;
}

export async function fetchLinearProjectIssues(projectId: string, options?: { force?: boolean }) {
  return cachedRequest(
    cacheKeyLinearIssues(projectId),
    () =>
      request<{
        issues: LinearIssueEntity[];
        workflowStates: { id: string; name: string; type: string; color?: string; position?: number }[];
        error?: string;
      }>(
        `/linear/projects/${encodeURIComponent(projectId)}/issues${linearListQuery({
          force: options?.force ? "1" : undefined,
        })}`,
        undefined,
        LINEAR_LIST_REQUEST_TIMEOUT_MS,
      ),
    { ttlMs: LINEAR_ISSUES_CACHE_TTL_MS, force: options?.force },
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
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeUsername: string | null;
  assigneeAvatarUrl: string | null;
  dueDate: string | null;
  estimate: number | null;
  branchName: string | null;
  teamId: string | null;
  teamName: string | null;
  projectId: string | null;
  projectName: string | null;
  labels: { id: string; name: string; color: string }[];
  availableLabels: { id: string; name: string; color: string }[];
  workflowStates: { id: string; name: string; type: string; color?: string; position?: number }[];
  teamMembers: {
    id: string;
    name: string;
    username: string | null;
    avatarUrl: string | null;
  }[];
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

export type LinearIssueSubIssue = {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
};

export type LinearIssueLinkedCustomer = {
  id: string;
  name: string;
};

export async function fetchLinearIssueSubIssues(issueId: string) {
  return request<{
    subIssues: LinearIssueSubIssue[];
    linkedCustomers: LinearIssueLinkedCustomer[];
    error?: string;
  }>(`/linear/issues/${encodeURIComponent(issueId)}/sub-issues`);
}

export type LinearIssueDetailUpdates = {
  stateId?: string;
  priority?: number;
  estimate?: number | null;
  labelIds?: string[];
  description?: string | null;
  title?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  teamId?: string;
  projectId?: string | null;
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

export type ConvertInboxIssueToProjectTaskResult = {
  sourceIssue: {
    id: string;
    identifier: string;
    url: string;
  };
  newIssue: {
    id: string;
    identifier: string;
    url: string;
    projectId: string;
    projectName: string;
  };
  error?: string;
};

export async function convertInboxIssueToProjectTask(
  issueId: string,
  options: {
    projectId: string;
    title?: string;
    description?: string | null;
  },
) {
  return request<ConvertInboxIssueToProjectTaskResult>(
    `/linear/issues/${encodeURIComponent(issueId)}/convert-to-project-task`,
    {
      method: "POST",
      body: JSON.stringify(options),
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
  agentSessionId: string | null;
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

export async function fetchLinearAgentSession(sessionId: string) {
  return request<{
    session: LinearAgentSessionSnapshot | null;
    error?: string;
  }>(`/linear/agent-sessions/${encodeURIComponent(sessionId)}`);
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

export async function updateLinearIssueCommentThread(
  issueId: string,
  threadId: string,
  body: string,
) {
  return request<{ comment: LinearComment; error?: string }>(
    `/linear/issues/${encodeURIComponent(issueId)}/comment-threads/${encodeURIComponent(threadId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ body }),
    },
  );
}

export async function deleteLinearIssueCommentThread(issueId: string, threadId: string) {
  return request<{ success: boolean; error?: string }>(
    `/linear/issues/${encodeURIComponent(issueId)}/comment-threads/${encodeURIComponent(threadId)}`,
    {
      method: "DELETE",
    },
  );
}

export async function deleteLinearIssue(issueId: string) {
  const result = await request<{ success: boolean; error?: string }>(
    `/linear/issues/${encodeURIComponent(issueId)}`,
    {
      method: "DELETE",
    },
  );
  if (result.success) {
    invalidateLinearContentListCaches();
  }
  return result;
}

export async function fetchLinearProjectDocuments(
  projectId: string,
  options?: { force?: boolean },
) {
  return cachedRequest(
    cacheKeyLinearProjectDocuments(projectId),
    () =>
      request<{ documents: ProjectDocumentEntity[]; error?: string }>(
        `/linear/projects/${encodeURIComponent(projectId)}/documents${linearListQuery({
          force: options?.force ? "1" : undefined,
        })}`,
        undefined,
        LINEAR_LIST_REQUEST_TIMEOUT_MS,
      ),
    { ttlMs: LINEAR_LIST_CACHE_TTL_MS, force: options?.force },
  );
}

export async function fetchLinearTeamDocuments(
  teamId: string,
  options?: { dailyOnly?: boolean; force?: boolean },
) {
  return cachedRequest(
    cacheKeyLinearTeamDocuments(teamId, options?.dailyOnly ?? false),
    () =>
      request<{ documents: ProjectDocumentEntity[]; error?: string }>(
        `/linear/teams/${encodeURIComponent(teamId)}/documents${linearListQuery({
          dailyOnly: options?.dailyOnly ? "true" : undefined,
          force: options?.force ? "1" : undefined,
        })}`,
        undefined,
        LINEAR_LIST_REQUEST_TIMEOUT_MS,
      ),
    { ttlMs: LINEAR_LIST_CACHE_TTL_MS, force: options?.force },
  );
}

export async function fetchLinearMeetingDocuments(options?: { force?: boolean }) {
  return cachedRequest(
    cacheKeyLinearMeetingDocuments(),
    () =>
      request<{ documents: ProjectDocumentEntity[]; error?: string }>(
        `/linear/documents/meetings${linearListQuery({
          force: options?.force ? "1" : undefined,
        })}`,
        undefined,
        LINEAR_LIST_REQUEST_TIMEOUT_MS,
      ),
    { ttlMs: LINEAR_LIST_CACHE_TTL_MS, force: options?.force },
  );
}

export async function fetchLinearProjectMeetingDocuments(projectId: string) {
  return request<{ documents: ProjectDocumentEntity[]; error?: string }>(
    `/linear/projects/${encodeURIComponent(projectId)}/documents/meetings`,
  );
}

export async function fetchLinearWorkspaceDocuments() {
  return request<{ documents: ProjectDocumentEntity[]; error?: string }>(
    "/linear/documents/workspace",
  );
}

export async function createLinearTeamDocument(teamId: string, options?: { title?: string }) {
  const result = await request<{ document: ProjectDocumentEntity | null; error?: string }>(
    `/linear/teams/${encodeURIComponent(teamId)}/documents`,
    {
      method: "POST",
      body: JSON.stringify(options ?? {}),
    },
  );
  if (result.document) {
    invalidateLinearContentListCaches();
  }
  return result;
}

export async function createLinearTeamMeetingDocument(teamId: string) {
  const result = await request<{ document: ProjectDocumentEntity | null; error?: string }>(
    `/linear/teams/${encodeURIComponent(teamId)}/documents`,
    {
      method: "POST",
      body: JSON.stringify({ meeting: true }),
    },
  );
  if (result.document) {
    invalidateLinearContentListCaches();
  }
  return result;
}

export type WorkoutMilestoneEntity = {
  id: string;
  name: string;
  targetDate: string | null;
  projectId: string;
};

export async function fetchLinearWorkoutMilestones(teamId: string) {
  return request<{ milestones: WorkoutMilestoneEntity[]; error?: string }>(
    `/linear/teams/${encodeURIComponent(teamId)}/workout-milestones`,
  );
}

export async function createLinearWorkoutMilestone(teamId: string, date: string) {
  return request<{ milestone: WorkoutMilestoneEntity | null; error?: string }>(
    `/linear/teams/${encodeURIComponent(teamId)}/workout-milestones`,
    {
      method: "POST",
      body: JSON.stringify({ date }),
    },
  );
}

export type WorkoutRepEntity = {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  reps: number | null;
  labels: { id: string; name: string; color: string }[];
};

export type WorkoutGroupSetEntity = {
  id: string;
  identifier: string;
  title: string;
  dueDate: string | null;
  status: string;
  stateId: string | null;
  stateType?: string;
  statusColor?: string;
  exercise: string | null;
  reps: WorkoutRepEntity[];
  createdAt: string | null;
};

export type WorkoutSessionEntity = {
  date: string;
  projectId: string;
  milestoneId: string;
  groupSets: WorkoutGroupSetEntity[];
};

export async function fetchLinearWorkoutSession(teamId: string, date: string) {
  return request<{ session: WorkoutSessionEntity | null; error?: string }>(
    `/linear/teams/${encodeURIComponent(teamId)}/workout-sessions/${encodeURIComponent(date)}`,
  );
}

export async function fetchLinearWorkoutSubIssueCount(teamId: string, date: string) {
  return request<{ count: number; error?: string }>(
    `/linear/teams/${encodeURIComponent(teamId)}/workout-sessions/${encodeURIComponent(date)}/sub-issue-count`,
  );
}

export async function createLinearWorkoutGroupSet(teamId: string, date: string, exercise: string) {
  return request<{ groupSet: WorkoutGroupSetEntity | null; error?: string }>(
    `/linear/teams/${encodeURIComponent(teamId)}/workout-sessions/${encodeURIComponent(date)}/group-sets`,
    {
      method: "POST",
      body: JSON.stringify({ exercise }),
    },
  );
}

export async function appendLinearWorkoutRep(
  teamId: string,
  date: string,
  input: {
    exercise?: string;
    groupSetId?: string | null;
    blankWeight?: boolean;
  },
) {
  return request<{
    groupSet: WorkoutGroupSetEntity | null;
    rep: WorkoutRepEntity | null;
    error?: string;
  }>(`/linear/teams/${encodeURIComponent(teamId)}/workout-sessions/${encodeURIComponent(date)}/reps`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchLinearTeamIssues(
  teamId: string,
  options?: { excludeSubIssues?: boolean; force?: boolean },
) {
  const rootOnly = options?.excludeSubIssues ?? false;
  return cachedRequest(
    cacheKeyLinearTeamIssues(teamId, rootOnly),
    () =>
      request<{
        issues: LinearIssueEntity[];
        workflowStates: { id: string; name: string; type: string; color?: string; position?: number }[];
        error?: string;
      }>(
        `/linear/teams/${encodeURIComponent(teamId)}/issues${linearListQuery({
          rootOnly: rootOnly ? "1" : undefined,
          force: options?.force ? "1" : undefined,
        })}`,
        undefined,
        LINEAR_LIST_REQUEST_TIMEOUT_MS,
      ),
    { ttlMs: LINEAR_LIST_CACHE_TTL_MS, force: options?.force },
  );
}

export async function createLinearTeamIssue(teamId: string, options?: { title?: string }) {
  const result = await request<{ issue: LinearIssueEntity | null; error?: string }>(
    `/linear/teams/${encodeURIComponent(teamId)}/issues`,
    {
      method: "POST",
      body: JSON.stringify(options ?? {}),
    },
  );
  if (result.issue) {
    invalidateLinearContentListCaches();
  }
  return result;
}

export async function createLinearProjectIssue(projectId: string, options?: { title?: string }) {
  const result = await request<{ issue: LinearIssueEntity | null; error?: string }>(
    `/linear/projects/${encodeURIComponent(projectId)}/issues`,
    {
      method: "POST",
      body: JSON.stringify(options ?? {}),
    },
  );
  if (result.issue) {
    invalidateLinearContentListCaches();
  }
  return result;
}

export async function uploadLinearTeamLetter(
  teamId: string,
  file: File,
  options?: { displayTitle?: string; issueUpdates?: LinearIssueDetailUpdates },
) {
  const formData = new FormData();
  formData.append("file", file);
  if (options?.displayTitle?.trim() || options?.issueUpdates) {
    formData.append(
      "metadata",
      JSON.stringify({
        displayTitle: options.displayTitle?.trim() || undefined,
        issueUpdates: options.issueUpdates,
      }),
    );
  }

  const headers: Record<string, string> = {};
  if (connection.token) {
    headers.Authorization = `Bearer ${connection.token}`;
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(
      `${connection.baseUrl}/linear/teams/${encodeURIComponent(teamId)}/letters/upload`,
      {
        method: "POST",
        credentials: "include",
        headers,
        body: formData,
      },
      120_000,
    );
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
    const parsed = JSON.parse(text) as {
      issue: LinearIssueEntity | null;
      document: ProjectDocumentEntity | null;
      assetUrl?: string;
      content?: string;
      error?: string;
    };
    if (parsed.issue || parsed.document) {
      invalidateLinearContentListCaches();
    }
    return parsed;
  } catch {
    throw new Error("Invalid response from agent server");
  }
}

export type LinearTeamProjectSummary = {
  id: string;
  name: string;
};

export async function fetchLinearTeamProjects(teamId: string, options?: { force?: boolean }) {
  return cachedRequest(
    cacheKeyLinearTeamProjects(teamId),
    () =>
      request<{ projects: LinearTeamProjectSummary[]; error?: string }>(
        `/linear/teams/${encodeURIComponent(teamId)}/projects${linearListQuery({
          force: options?.force ? "1" : undefined,
        })}`,
        undefined,
        LINEAR_LIST_REQUEST_TIMEOUT_MS,
      ),
    { ttlMs: LINEAR_LIST_CACHE_TTL_MS, force: options?.force },
  );
}

export async function fetchLinearTeamLabels(teamId: string, options?: { group?: string }) {
  const group = options?.group?.trim();
  const query = group ? `?group=${encodeURIComponent(group)}` : "";
  return request<{
    labels: { id: string; name: string; color: string }[];
    error?: string;
  }>(`/linear/teams/${encodeURIComponent(teamId)}/labels${query}`);
}

export async function createLinearTeamProject(teamId: string, name?: string) {
  return request<{ project: LinearTeamProjectSummary | null; error?: string }>(
    `/linear/teams/${encodeURIComponent(teamId)}/projects`,
    {
      method: "POST",
      body: JSON.stringify(name?.trim() ? { name: name.trim() } : {}),
    },
  );
}

export async function createLinearProjectDocument(projectId: string) {
  const result = await request<{ document: ProjectDocumentEntity | null; error?: string }>(
    `/linear/projects/${encodeURIComponent(projectId)}/documents`,
    { method: "POST" },
  );
  if (result.document) {
    invalidateLinearContentListCaches();
  }
  return result;
}

export async function createLinearProjectMeetingDocument(projectId: string) {
  const result = await request<{ document: ProjectDocumentEntity | null; error?: string }>(
    `/linear/projects/${encodeURIComponent(projectId)}/documents`,
    {
      method: "POST",
      body: JSON.stringify({ meeting: true }),
    },
  );
  if (result.document) {
    invalidateLinearContentListCaches();
  }
  return result;
}

export type LinearDocumentContent = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  url?: string;
  teamId?: string;
  teamName?: string;
  projectId?: string;
  projectName?: string;
  linkedIssueId?: string;
  linkedIssueIdentifier?: string;
};

export async function fetchLinearDocument(documentId: string) {
  return request<{ document: LinearDocumentContent | null; error?: string }>(
    `/linear/documents/${encodeURIComponent(documentId)}`,
  );
}

export async function updateLinearDocument(
  documentId: string,
  updates: {
    title?: string;
    content?: string;
    body?: string;
    projectId?: string | null;
    teamId?: string;
    issueId?: string | null;
  },
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
  const result = await request<{ ok: boolean; error?: string }>(
    `/linear/documents/${encodeURIComponent(documentId)}`,
    { method: "DELETE" },
  );
  if (result.ok) {
    invalidateLinearContentListCaches();
  }
  return result;
}

export type CursorModelSummary = {
  id: string;
  displayName: string;
  aliases?: string[];
};

export async function fetchCursorModels() {
  return request<{ models: CursorModelSummary[] }>("/integrations/cursor/models");
}

export async function getAccountWorkspace() {
  return request<AccountWorkspaceResponse>("/accounts/workspace");
}

export async function updateAccountWorkspace(updates: {
  inboxLinearTeamId?: string | null;
  dailyLinearTeamId?: string | null;
  workoutsLinearTeamId?: string | null;
  lettersLinearTeamId?: string | null;
  knowledgeBaseLinearTeamId?: string | null;
  addressbookLinearTeamId?: string | null;
  setupCompletedAt?: string | null;
  markSetupComplete?: boolean;
}) {
  return request<AccountWorkspaceResponse>("/accounts/workspace", {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteAccount() {
  return request<DeleteAccountResponse>("/accounts/workspace", {
    method: "DELETE",
  });
}

export async function listAdminUserAccounts() {
  return request<AdminUserAccountsResponse>("/accounts/admin/users");
}

export async function deleteAdminUserAccount(linearUserId: string) {
  return request<{ linearUserId: string; deleted: boolean }>(
    `/accounts/admin/users/${encodeURIComponent(linearUserId)}`,
    { method: "DELETE" },
  );
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
  const result = await request<{
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
  invalidateRequestCache(REQUEST_CACHE_KEYS.settings);
  return result;
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

export function getAuthHeader(): string {
  return connection.token ? `Bearer ${connection.token}` : "";
}

export async function fetchDocumentPdfBlob(sourceUrl: string): Promise<Blob> {
  const path = `/pdf/proxy?url=${encodeURIComponent(sourceUrl)}`;
  const headers: Record<string, string> = {};
  if (connection.token) {
    headers.Authorization = `Bearer ${connection.token}`;
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(
      `${connection.baseUrl}${path}`,
      {
        credentials: "include",
        headers,
      },
      60_000,
    );
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
    const errorMessage = await readErrorMessage(response);
    throw new Error(errorMessage);
  }

  return response.blob();
}
