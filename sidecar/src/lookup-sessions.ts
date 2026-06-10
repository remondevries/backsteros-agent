import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { getDataDir } from "./config.ts";
import { loadStoredLookupAttachmentTexts } from "./lookup-attachment-store.ts";
import { formatExtractedAttachmentText } from "./lookup-attachments.ts";
import type { GeminiContentPart } from "./lookup-attachments.ts";
import type {
  PersistedChatMessage,
  PersistedRunViewModel,
} from "./sessions.ts";

export interface GeminiHistoryTurn {
  role: "user" | "assistant";
  parts: GeminiContentPart[];
}

export const DEFAULT_LOOKUP_SESSION_TITLE = "New Lookup";

export interface LookupSessionTabMeta {
  sessionId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface LookupSessionIndex {
  activeSessionId: string | null;
  tabs: LookupSessionTabMeta[];
}

export interface LookupSessionRecord {
  sessionId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: PersistedChatMessage[];
  runs: Record<string, PersistedRunViewModel>;
}

export interface LookupSessionListItem extends LookupSessionTabMeta {
  messages: PersistedChatMessage[];
  runs: Record<string, PersistedRunViewModel>;
}

const DEFAULT_INDEX: LookupSessionIndex = {
  activeSessionId: null,
  tabs: [],
};

function sessionsDir(): string {
  const dir = join(getDataDir(), "lookup-sessions");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function indexPath(): string {
  return join(getDataDir(), "lookup-sessions-index.json");
}

function sessionFilePath(sessionId: string): string {
  return join(sessionsDir(), `${sessionId}.json`);
}

function readIndex(): LookupSessionIndex {
  const path = indexPath();
  if (!existsSync(path)) {
    return { ...DEFAULT_INDEX, tabs: [] };
  }
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as LookupSessionIndex;
    return {
      activeSessionId: parsed.activeSessionId ?? null,
      tabs: parsed.tabs ?? [],
    };
  } catch {
    return { ...DEFAULT_INDEX, tabs: [] };
  }
}

function writeIndex(index: LookupSessionIndex): void {
  writeFileSync(indexPath(), JSON.stringify(index, null, 2));
}

function readSessionRecord(sessionId: string): LookupSessionRecord | null {
  const path = sessionFilePath(sessionId);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as LookupSessionRecord;
  } catch {
    return null;
  }
}

function writeSessionRecord(record: LookupSessionRecord): void {
  writeFileSync(sessionFilePath(record.sessionId), JSON.stringify(record, null, 2));
}

function deleteSessionFile(sessionId: string): void {
  const path = sessionFilePath(sessionId);
  if (existsSync(path)) {
    unlinkSync(path);
  }
}

function now(): number {
  return Date.now();
}

export function listLookupSessions(): LookupSessionListItem[] {
  const index = readIndex();
  return index.tabs
    .map((tab) => {
      const record = readSessionRecord(tab.sessionId);
      if (!record) return null;
      return {
        sessionId: tab.sessionId,
        title: tab.title,
        createdAt: tab.createdAt,
        updatedAt: tab.updatedAt,
        messages: record.messages,
        runs: record.runs,
      } satisfies LookupSessionListItem;
    })
    .filter((item): item is LookupSessionListItem => item !== null);
}

export function getActiveLookupSessionId(): string | null {
  return readIndex().activeSessionId;
}

export function lookupSessionExists(sessionId: string): boolean {
  return existsSync(sessionFilePath(sessionId));
}

export function createLookupSessionRecord(
  title = DEFAULT_LOOKUP_SESSION_TITLE,
): LookupSessionRecord {
  const sessionId = crypto.randomUUID();
  const timestamp = now();
  const record: LookupSessionRecord = {
    sessionId,
    title,
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [],
    runs: {},
  };

  writeSessionRecord(record);

  const index = readIndex();
  const nextIndex: LookupSessionIndex = {
    activeSessionId: sessionId,
    tabs: [
      ...index.tabs,
      {
        sessionId,
        title,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  };
  writeIndex(nextIndex);
  return record;
}

export function deleteLookupSessionRecord(sessionId: string): LookupSessionIndex {
  deleteSessionFile(sessionId);
  const index = readIndex();
  const tabs = index.tabs.filter((tab) => tab.sessionId !== sessionId);
  const activeSessionId =
    index.activeSessionId === sessionId ? tabs[0]?.sessionId ?? null : index.activeSessionId;
  const nextIndex = { activeSessionId, tabs };
  writeIndex(nextIndex);
  return nextIndex;
}

export function saveLookupSessionState(
  sessionId: string,
  state: {
    messages: PersistedChatMessage[];
    runs: Record<string, PersistedRunViewModel>;
  },
): LookupSessionRecord | null {
  const record = readSessionRecord(sessionId);
  if (!record) return null;

  const updated: LookupSessionRecord = {
    ...record,
    messages: state.messages,
    runs: state.runs,
    updatedAt: now(),
  };
  writeSessionRecord(updated);

  const index = readIndex();
  writeIndex({
    ...index,
    tabs: index.tabs.map((tab) =>
      tab.sessionId === sessionId ? { ...tab, updatedAt: updated.updatedAt } : tab,
    ),
  });
  return updated;
}

export function setActiveLookupSession(sessionId: string): LookupSessionIndex | null {
  const index = readIndex();
  if (!index.tabs.some((tab) => tab.sessionId === sessionId)) {
    return null;
  }
  const nextIndex = { ...index, activeSessionId: sessionId };
  writeIndex(nextIndex);
  return nextIndex;
}

export function updateLookupSessionTitle(
  sessionId: string,
  title: string,
): LookupSessionRecord | null {
  const record = readSessionRecord(sessionId);
  if (!record) return null;

  const normalized = title.trim() || DEFAULT_LOOKUP_SESSION_TITLE;
  const updated: LookupSessionRecord = {
    ...record,
    title: normalized,
    updatedAt: now(),
  };
  writeSessionRecord(updated);

  const index = readIndex();
  writeIndex({
    ...index,
    tabs: index.tabs.map((tab) =>
      tab.sessionId === sessionId
        ? { ...tab, title: normalized, updatedAt: updated.updatedAt }
        : tab,
    ),
  });
  return updated;
}

export function clearLookupSessionState(sessionId: string): LookupSessionRecord | null {
  return saveLookupSessionState(sessionId, { messages: [], runs: {} });
}

function buildUserHistoryParts(message: PersistedChatMessage): GeminiContentPart[] {
  const textParts: string[] = [];
  if (message.text.trim()) {
    textParts.push(message.text.trim());
  }

  const storageIds =
    message.attachments
      ?.map((attachment) => attachment.storageId)
      .filter((storageId): storageId is string => Boolean(storageId)) ?? [];
  const storedTexts = loadStoredLookupAttachmentTexts(storageIds);
  for (const stored of storedTexts) {
    textParts.push(formatExtractedAttachmentText(stored.name, stored.text));
  }

  for (const attachment of message.attachments ?? []) {
    if (attachment.storageId && storedTexts.some((stored) => stored.name === attachment.name)) {
      continue;
    }
    textParts.push(`[Attached file: ${attachment.name}]`);
  }

  return [{ text: textParts.join("\n\n") }];
}

export function loadLookupHistory(sessionId: string): GeminiHistoryTurn[] {
  const record = readSessionRecord(sessionId);
  if (!record) return [];

  const history: GeminiHistoryTurn[] = [];
  for (const message of record.messages) {
    if (message.role === "user") {
      history.push({
        role: "user",
        parts: buildUserHistoryParts(message),
      });
      if (message.runId) {
        const run = record.runs[message.runId];
        if (run?.text.trim()) {
          history.push({
            role: "assistant",
            parts: [{ text: run.text.trim() }],
          });
        }
      }
      continue;
    }

    if (message.role === "assistant" && message.text.trim()) {
      history.push({
        role: "assistant",
        parts: [{ text: message.text.trim() }],
      });
    }
  }
  return history;
}
