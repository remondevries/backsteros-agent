import type { LinearWatcherChangeEvent, LinearWatcherChangeKind } from "./notificationPayloads";

const WATCHER_ACTIVITY_LOG_STORAGE_KEY = "backsteros.linear-watcher.activity-log.v1";
export const WATCHER_ACTIVITY_LOG_MAX_ENTRIES = 2500;

export type LinearWatcherActivityLogEntry = {
  id: string;
  projectId: string;
  projectName: string;
  issueId: string;
  identifier: string;
  title: string;
  summary: string;
  changeKind: LinearWatcherChangeKind;
  detectedAt: string;
  previousStatus?: string;
  currentStatus?: string;
};

const logListeners = new Set<(entry: LinearWatcherActivityLogEntry) => void>();
let cachedEntries: LinearWatcherActivityLogEntry[] | null = null;

function getLocalStorageSafely(): Storage | null {
  try {
    if (typeof localStorage === "undefined") {
      return null;
    }
    return localStorage;
  } catch {
    return null;
  }
}

function normalizeLogEntry(value: unknown): LinearWatcherActivityLogEntry | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Partial<LinearWatcherActivityLogEntry>;
  if (
    typeof entry.id !== "string" ||
    typeof entry.projectId !== "string" ||
    typeof entry.projectName !== "string" ||
    typeof entry.issueId !== "string" ||
    typeof entry.identifier !== "string" ||
    typeof entry.title !== "string" ||
    typeof entry.summary !== "string" ||
    typeof entry.changeKind !== "string" ||
    typeof entry.detectedAt !== "string"
  ) {
    return null;
  }
  return {
    id: entry.id,
    projectId: entry.projectId,
    projectName: entry.projectName,
    issueId: entry.issueId,
    identifier: entry.identifier,
    title: entry.title,
    summary: entry.summary,
    changeKind: entry.changeKind as LinearWatcherChangeKind,
    detectedAt: entry.detectedAt,
    ...(typeof entry.previousStatus === "string" ? { previousStatus: entry.previousStatus } : {}),
    ...(typeof entry.currentStatus === "string" ? { currentStatus: entry.currentStatus } : {}),
  };
}

function readEntriesFromStorage(): LinearWatcherActivityLogEntry[] {
  const storage = getLocalStorageSafely();
  if (!storage) return [];
  try {
    const raw = storage.getItem(WATCHER_ACTIVITY_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const entries = parsed
      .map(normalizeLogEntry)
      .filter((entry): entry is LinearWatcherActivityLogEntry => entry !== null);
    if (entries.length <= WATCHER_ACTIVITY_LOG_MAX_ENTRIES) {
      return entries;
    }
    return entries.slice(entries.length - WATCHER_ACTIVITY_LOG_MAX_ENTRIES);
  } catch {
    return [];
  }
}

function persistEntries(entries: LinearWatcherActivityLogEntry[]): void {
  const storage = getLocalStorageSafely();
  if (!storage) return;
  try {
    storage.setItem(WATCHER_ACTIVITY_LOG_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore storage quota / private mode errors.
  }
}

function ensureEntriesLoaded(): LinearWatcherActivityLogEntry[] {
  if (cachedEntries) {
    return cachedEntries;
  }
  cachedEntries = readEntriesFromStorage();
  return cachedEntries;
}

function emitLogEntry(entry: LinearWatcherActivityLogEntry): void {
  for (const listener of logListeners) {
    listener(entry);
  }
}

export function subscribeToLinearWatcherActivityLog(
  listener: (entry: LinearWatcherActivityLogEntry) => void,
): () => void {
  logListeners.add(listener);
  return () => logListeners.delete(listener);
}

export function appendLinearWatcherActivityLog(
  event: LinearWatcherChangeEvent,
): LinearWatcherActivityLogEntry {
  const entries = ensureEntriesLoaded();
  const id = `${event.projectId}:${event.issueId}:${event.changeKind}:${event.detectedAt}`;
  const duplicate = entries.find((entry) => entry.id === id);
  if (duplicate) {
    return duplicate;
  }

  const nextEntry: LinearWatcherActivityLogEntry = {
    id,
    projectId: event.projectId,
    projectName: event.projectName,
    issueId: event.issueId,
    identifier: event.identifier,
    title: event.title,
    summary: event.summary,
    changeKind: event.changeKind,
    detectedAt: event.detectedAt,
    ...(event.previousStatus ? { previousStatus: event.previousStatus } : {}),
    ...(event.currentStatus ? { currentStatus: event.currentStatus } : {}),
  };

  entries.push(nextEntry);
  if (entries.length > WATCHER_ACTIVITY_LOG_MAX_ENTRIES) {
    entries.splice(0, entries.length - WATCHER_ACTIVITY_LOG_MAX_ENTRIES);
  }
  persistEntries(entries);
  emitLogEntry(nextEntry);
  return nextEntry;
}

export function getLinearWatcherActivityLogEntries(options?: {
  projectId?: string | null;
  limit?: number;
}): LinearWatcherActivityLogEntry[] {
  const entries = ensureEntriesLoaded();
  const projectId = options?.projectId?.trim() || null;
  const limit = Math.max(0, options?.limit ?? entries.length);
  if (limit === 0) {
    return [];
  }

  const result: LinearWatcherActivityLogEntry[] = [];
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index]!;
    if (projectId && entry.projectId !== projectId) {
      continue;
    }
    result.push(entry);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}

export function __resetLinearWatcherActivityLogForTests(): void {
  cachedEntries = [];
  persistEntries(cachedEntries);
}
