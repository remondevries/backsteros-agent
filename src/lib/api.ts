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
const HEALTH_REQUEST_TIMEOUT_MS = 4_000;

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

export async function waitForSidecar(retries = 60, delayMs = 250): Promise<void> {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      await getHealth();
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

export async function getWhoopSetup() {
  return request<{ envPath: string; authCommand: string; docsUrl: string }>(
    "/integrations/whoop/setup",
    { method: "POST" },
  );
}

export async function fetchWhoopToday() {
  return request<{
    authenticated: boolean;
    snapshot: WhoopSnapshotEntity | null;
    error?: string;
  }>("/whoop/today");
}

export async function fetchLinearToday() {
  return request<{
    configured: boolean;
    dueDate: string;
    issues: LinearIssueEntity[];
    error?: string;
  }>("/linear/today");
}

export async function fetchVaultDailyNoteToday() {
  return request<{
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
  }>("/vault/daily-note/today");
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

export async function getHealth() {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${connection.baseUrl}/healthz`, undefined, HEALTH_REQUEST_TIMEOUT_MS);
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

  return response.json() as Promise<{
    ok: boolean;
    hasApiKey: boolean;
    hasLinearApiKey: boolean;
    hasGoogleCalendarCredentials: boolean;
    hasGoogleCalendarAuth: boolean;
    hasWhoopConfigured: boolean;
    hasWhoopAuth: boolean;
  }>;
}

export async function getSettings() {
  return request<AppSettings>("/settings");
}

export async function updateSettings(updates: {
  notesPath?: string;
  vaultName?: string | null;
  modelMode?: ModelMode;
  executionMode?: ExecutionMode;
  issueLinkMode?: LinearIssueLinkMode;
}) {
  return request<{
    notesPath: string | null;
    vaultName: string | null;
    agentId: string | null;
    modelMode: ModelMode;
    modelId: string;
    modelName: string;
    executionMode: ExecutionMode;
    issueLinkMode: LinearIssueLinkMode;
  }>("/settings", {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export interface SessionListResponse {
  activeSessionId: string | null;
  sessions: SessionRecordResponse[];
}

export interface SessionRecordResponse {
  sessionId: string;
  agentId: string;
  notesPath: string;
  title: string;
  createdAt: number;
  updatedAt: number;
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

export async function sendMessage(
  sessionId: string,
  text: string,
  attachments?: AttachmentWireInput[],
  toolPins?: ToolPinSelection,
  quickActionId?: string,
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
