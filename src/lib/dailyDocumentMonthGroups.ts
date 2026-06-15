import type { VaultDirectoryEntry } from "./api";
import { compareDocumentsNewestFirst, type ProjectDocumentEntity } from "./documentStatusGroups";
import { dailyDateFromPath, formatDateKey, parseDailyJournalDate } from "./vaultDates";

export const DAILY_MONTH_UNKNOWN_KEY = "unknown";

export type DailyMonthGroup<T> = {
  key: string;
  label: string;
  entries: T[];
};

export function formatDailyMonthLabel(monthKey: string): string {
  if (monthKey === DAILY_MONTH_UNKNOWN_KEY) return "Other";
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) return monthKey;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function dailyMonthKeyFromDateKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function dailyMonthKeyForToday(): string {
  return dailyMonthKeyFromDateKey(formatDateKey(new Date()));
}

export function todayDailyJournalDateKey(now = new Date()): string {
  return formatDateKey(now);
}

export function hasDailyJournalDocument(
  documents: ProjectDocumentEntity[],
  dateKey: string,
): boolean {
  return documents.some((document) => parseDailyJournalDate(document.title) === dateKey);
}

export function compareDateKeysNewestFirst(left: string, right: string): number {
  return right.localeCompare(left);
}

export function compareDailyJournalDocumentsNewestFirst(
  left: ProjectDocumentEntity,
  right: ProjectDocumentEntity,
): number {
  const leftDate = parseDailyJournalDate(left.title);
  const rightDate = parseDailyJournalDate(right.title);
  if (leftDate && rightDate) {
    return compareDateKeysNewestFirst(leftDate, rightDate);
  }
  if (leftDate) return -1;
  if (rightDate) return 1;
  return compareDocumentsNewestFirst(left, right);
}

function buildMonthGroups<T>(
  items: T[],
  resolveDateKey: (item: T) => string | null,
  sortEntries: (entries: T[]) => T[],
): DailyMonthGroup<T>[] {
  const byKey = new Map<string, T[]>();

  for (const item of items) {
    const dateKey = resolveDateKey(item);
    const monthKey = dateKey ? dailyMonthKeyFromDateKey(dateKey) : DAILY_MONTH_UNKNOWN_KEY;
    const bucket = byKey.get(monthKey);
    if (bucket) {
      bucket.push(item);
    } else {
      byKey.set(monthKey, [item]);
    }
  }

  const keys = [...byKey.keys()].sort((left, right) => {
    if (left === DAILY_MONTH_UNKNOWN_KEY) return 1;
    if (right === DAILY_MONTH_UNKNOWN_KEY) return -1;
    return right.localeCompare(left);
  });

  return keys.map((key) => {
    const entries = sortEntries(byKey.get(key) ?? []);
    return { key, label: formatDailyMonthLabel(key), entries };
  });
}

function resolveVaultDailyEntryDateKey(entry: VaultDirectoryEntry): string | null {
  const fromPath = dailyDateFromPath(entry.path);
  if (fromPath) return fromPath;
  return parseDailyJournalDate(entry.name.replace(/\.md$/i, ""));
}

export function groupVaultDailyEntriesByMonth(
  entries: VaultDirectoryEntry[],
): DailyMonthGroup<VaultDirectoryEntry>[] {
  const files = entries.filter((entry) => entry.kind === "file");
  return buildMonthGroups(
    files,
    resolveVaultDailyEntryDateKey,
    (items) =>
      [...items].sort((left, right) =>
        compareDateKeysNewestFirst(
          resolveVaultDailyEntryDateKey(left) ?? "",
          resolveVaultDailyEntryDateKey(right) ?? "",
        ),
      ),
  );
}

export function groupProjectDocumentsByMonth(
  documents: ProjectDocumentEntity[],
): DailyMonthGroup<ProjectDocumentEntity>[] {
  return buildMonthGroups(
    documents,
    (document) => parseDailyJournalDate(document.title),
    (items) => [...items].sort(compareDailyJournalDocumentsNewestFirst),
  );
}

export function resolveVaultDailyDueDateKey(entry: VaultDirectoryEntry): string | null {
  return resolveVaultDailyEntryDateKey(entry) ?? null;
}
