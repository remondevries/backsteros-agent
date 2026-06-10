import type { AttachmentWireInput, ChatMessage, MessageAttachment, RunViewModel } from "../chat/types";
import { getAuthHeader, getSidecarConnection } from "./api";

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

async function request<T>(path: string, init?: RequestInit, timeoutMs = 120_000) {
  const { baseUrl, token } = getSidecarConnection();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    const text = await response.text();
    if (!text) {
      throw new Error("Empty response from agent server");
    }

    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export interface LookupSessionRecordResponse {
  sessionId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  runs: Record<string, RunViewModel>;
}

export interface LookupSessionListResponse {
  activeSessionId: string | null;
  sessions: LookupSessionRecordResponse[];
}

export interface DeleteLookupSessionResponse {
  activeSessionId: string | null;
  createdSession: LookupSessionRecordResponse | null;
}

export async function listLookupSessions() {
  return request<LookupSessionListResponse>("/lookup/sessions");
}

export async function createLookupSession() {
  return request<LookupSessionRecordResponse>("/lookup/sessions", {
    method: "POST",
    body: "{}",
  });
}

export async function deleteLookupSession(sessionId: string) {
  return request<DeleteLookupSessionResponse>(
    `/lookup/sessions/${encodeURIComponent(sessionId)}`,
    { method: "DELETE" },
  );
}

export async function saveLookupSessionState(
  sessionId: string,
  state: { messages: ChatMessage[]; runs: Record<string, RunViewModel> },
) {
  return request<{ ok: boolean }>(
    `/lookup/sessions/${encodeURIComponent(sessionId)}/state`,
    {
      method: "PUT",
      body: JSON.stringify(state),
    },
    10_000,
  );
}

export async function setActiveLookupSession(sessionId: string) {
  return request<{ activeSessionId: string | null }>(
    `/lookup/sessions/${encodeURIComponent(sessionId)}/active`,
    { method: "PUT", body: "{}" },
  );
}

export async function clearLookupSession(sessionId: string) {
  return request<{ ok: boolean; title: string }>(
    `/lookup/sessions/${encodeURIComponent(sessionId)}/clear`,
    { method: "POST", body: "{}" },
  );
}

export async function updateLookupSessionTitle(sessionId: string, title: string) {
  return request<{ title: string }>(
    `/lookup/sessions/${encodeURIComponent(sessionId)}/title`,
    {
      method: "PUT",
      body: JSON.stringify({ title }),
    },
  );
}

export type LookupDepthMode = "fast" | "deep";
export type LookupSearchMode = "web" | "docs";
export type LookupOutputFormat = "default" | "bullets" | "action-items" | "outline";

export async function sendLookupMessage(
  sessionId: string,
  text: string,
  options: {
    depthMode?: LookupDepthMode;
    searchMode?: LookupSearchMode;
    outputFormat?: LookupOutputFormat;
    attachments?: AttachmentWireInput[];
  } = {},
) {
  const {
    depthMode = "fast",
    searchMode = "web",
    outputFormat = "default",
    attachments = [],
  } = options;

  return request<{ runId: string; attachments?: MessageAttachment[] }>(
    `/lookup/sessions/${encodeURIComponent(sessionId)}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ text, depthMode, searchMode, outputFormat, attachments }),
    },
  );
}

export function lookupEventsUrl(sessionId: string, runId: string) {
  const { baseUrl } = getSidecarConnection();
  return `${baseUrl}/lookup/sessions/${encodeURIComponent(sessionId)}/events?runId=${encodeURIComponent(runId)}`;
}

export function getLookupAuthHeader() {
  return getAuthHeader();
}
