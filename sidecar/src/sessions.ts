import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { getDataDir } from "./config.ts";
import { getAgentIdForPath, loadSettings } from "./store.ts";

export const DEFAULT_SESSION_TITLE = "New Chat";

export interface SessionTabMeta {
  sessionId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface SessionIndex {
  activeSessionId: string | null;
  tabs: SessionTabMeta[];
}

export interface PersistedChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt?: number;
  runId?: string;
  attachments?: Array<{
    kind: "image" | "text" | "binary";
    name: string;
    mimeType: string;
    vaultPath?: string;
    previewUrl?: string;
    storageId?: string;
  }>;
  contextChips?: Array<{ id: string; title: string; entityType: string }>;
}

export interface PersistedRunViewModel {
  runId: string;
  durationMs?: number;
  startedAt?: number;
  finishedAt?: number;
  status?: "running" | "finished" | "error" | "cancelled";
  steps: Array<{
    stepId: string;
    kind: "linear" | "calendar" | "notes" | "generic";
    label: string;
    status: "running" | "completed" | "error";
    durationMs?: number;
  }>;
  text: string;
  entities: unknown[];
  approvals: Array<{
    approvalId: string;
    summary: string;
    action: string;
    path?: string;
    resolved?: boolean;
    approved?: boolean;
  }>;
  expanded: boolean;
}

export interface SessionRecord {
  sessionId: string;
  agentId: string;
  notesPath: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: PersistedChatMessage[];
  runs: Record<string, PersistedRunViewModel>;
}

export interface SessionListItem extends SessionTabMeta {
  agentId: string;
  notesPath: string;
  messages: PersistedChatMessage[];
  runs: Record<string, PersistedRunViewModel>;
}

const DEFAULT_INDEX: SessionIndex = {
  activeSessionId: null,
  tabs: [],
};

function sessionsDir(): string {
  const dir = join(getDataDir(), "sessions");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function indexPath(): string {
  return join(getDataDir(), "sessions-index.json");
}

function sessionFilePath(sessionId: string): string {
  return join(sessionsDir(), `${sessionId}.json`);
}

function readIndex(): SessionIndex {
  const path = indexPath();
  if (!existsSync(path)) {
    return { ...DEFAULT_INDEX, tabs: [] };
  }
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as SessionIndex;
    return {
      activeSessionId: parsed.activeSessionId ?? null,
      tabs: parsed.tabs ?? [],
    };
  } catch {
    return { ...DEFAULT_INDEX, tabs: [] };
  }
}

function writeIndex(index: SessionIndex): void {
  writeFileSync(indexPath(), JSON.stringify(index, null, 2));
}

function readSessionRecord(sessionId: string): SessionRecord | null {
  const path = sessionFilePath(sessionId);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as SessionRecord;
  } catch {
    return null;
  }
}

function writeSessionRecord(record: SessionRecord): void {
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

function touchTab(index: SessionIndex, sessionId: string): SessionIndex {
  return {
    ...index,
    tabs: index.tabs.map((tab) =>
      tab.sessionId === sessionId ? { ...tab, updatedAt: now() } : tab,
    ),
  };
}

export function migrateLegacySessionIfNeeded(notesPath: string): SessionIndex {
  let index = readIndex();
  if (index.tabs.length > 0) {
    return index;
  }

  const settings = loadSettings();
  const legacyAgentId = getAgentIdForPath(settings, notesPath);
  if (!legacyAgentId) {
    return index;
  }

  const sessionId = crypto.randomUUID();
  const timestamp = now();
  const record: SessionRecord = {
    sessionId,
    agentId: legacyAgentId,
    notesPath,
    title: DEFAULT_SESSION_TITLE,
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [],
    runs: {},
  };

  writeSessionRecord(record);
  index = {
    activeSessionId: sessionId,
    tabs: [
      {
        sessionId,
        title: DEFAULT_SESSION_TITLE,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  };
  writeIndex(index);
  return index;
}

export function listSessions(): SessionListItem[] {
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
        agentId: record.agentId,
        notesPath: record.notesPath,
        messages: record.messages,
        runs: record.runs,
      } satisfies SessionListItem;
    })
    .filter((item): item is SessionListItem => item !== null);
}

export function getActiveSessionId(): string | null {
  return readIndex().activeSessionId;
}

export function loadSessionState(sessionId: string): SessionRecord | null {
  return readSessionRecord(sessionId);
}

export function createSessionRecord(
  notesPath: string,
  agentId = "",
  title = DEFAULT_SESSION_TITLE,
): SessionRecord {
  const sessionId = crypto.randomUUID();
  const timestamp = now();
  const record: SessionRecord = {
    sessionId,
    agentId,
    notesPath,
    title,
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [],
    runs: {},
  };

  writeSessionRecord(record);

  const index = readIndex();
  const nextIndex: SessionIndex = {
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

export function deleteSessionRecord(sessionId: string): SessionIndex {
  deleteSessionFile(sessionId);

  const index = readIndex();
  const tabs = index.tabs.filter((tab) => tab.sessionId !== sessionId);
  const activeSessionId =
    index.activeSessionId === sessionId ? (tabs.at(-1)?.sessionId ?? null) : index.activeSessionId;

  const nextIndex: SessionIndex = { activeSessionId, tabs };
  writeIndex(nextIndex);
  return nextIndex;
}

export function saveSessionState(
  sessionId: string,
  state: {
    messages: PersistedChatMessage[];
    runs: Record<string, PersistedRunViewModel>;
  },
): SessionRecord | null {
  const record = readSessionRecord(sessionId);
  if (!record) return null;

  const updated: SessionRecord = {
    ...record,
    messages: state.messages,
    runs: state.runs,
    updatedAt: now(),
  };
  writeSessionRecord(updated);

  const index = touchTab(readIndex(), sessionId);
  writeIndex(index);
  return updated;
}

export function setActiveSession(sessionId: string): SessionIndex | null {
  const index = readIndex();
  if (!index.tabs.some((tab) => tab.sessionId === sessionId)) {
    return null;
  }
  const nextIndex: SessionIndex = { ...index, activeSessionId: sessionId };
  writeIndex(nextIndex);
  return nextIndex;
}

export function updateSessionTitle(sessionId: string, title: string): SessionRecord | null {
  const record = readSessionRecord(sessionId);
  if (!record) return null;

  const trimmed = title.trim() || DEFAULT_SESSION_TITLE;
  const updated: SessionRecord = {
    ...record,
    title: trimmed,
    updatedAt: now(),
  };
  writeSessionRecord(updated);

  const index = readIndex();
  writeIndex({
    ...index,
    tabs: index.tabs.map((tab) =>
      tab.sessionId === sessionId
        ? { ...tab, title: trimmed, updatedAt: updated.updatedAt }
        : tab,
    ),
  });
  return updated;
}

export function updateSessionAgentId(sessionId: string, agentId: string): void {
  const record = readSessionRecord(sessionId);
  if (!record) return;
  writeSessionRecord({ ...record, agentId, updatedAt: now() });
}

export function getSessionAgentId(sessionId: string): string | null {
  return readSessionRecord(sessionId)?.agentId ?? null;
}

export function getSessionNotesPath(sessionId: string): string | null {
  return readSessionRecord(sessionId)?.notesPath ?? null;
}

export function sessionExists(sessionId: string): boolean {
  return readSessionRecord(sessionId) !== null;
}

export function clearAllSessions(): void {
  const dir = sessionsDir();
  for (const file of readdirSync(dir)) {
    if (file.endsWith(".json")) {
      unlinkSync(join(dir, file));
    }
  }
  if (existsSync(indexPath())) {
    unlinkSync(indexPath());
  }
}
