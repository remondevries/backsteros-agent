export function parseEntryDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed);
}

export function formatDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function resolveEntryDueDateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  const matchedIsoDate = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
  if (matchedIsoDate?.[1]) return matchedIsoDate[1];
  const parsed = parseEntryDate(normalized);
  if (!parsed) return null;
  return formatDateKey(parsed);
}

export function resolveIsoWeekLabel(date: Date): string {
  const weekDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayOfWeek = weekDate.getUTCDay() || 7;
  weekDate.setUTCDate(weekDate.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(weekDate.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(
    ((weekDate.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${weekNumber} week`;
}

const DAILY_NOTE_PATH_PATTERN = /^Daily\/(\d{4}-\d{2}-\d{2})\.md$/i;

export function dailyDateFromPath(path: string): string | null {
  const normalized = path.replace(/\\/g, "/");
  const match = DAILY_NOTE_PATH_PATTERN.exec(normalized);
  return match?.[1] ?? null;
}
