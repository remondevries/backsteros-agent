export function getISOWeekNumber(date = new Date()): number {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

export function formatGroceryWeekNumber(week: number): string {
  return String(week);
}

export function formatCurrentGroceryWeekNumber(date = new Date()): string {
  return formatGroceryWeekNumber(getISOWeekNumber(date));
}

export function isValidGroceryWeekNumber(value: string): boolean {
  return normalizeGroceryWeekNumber(value) != null;
}

export function normalizeGroceryWeekNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(?:week\s*|w)?(\d{1,2})$/i);
  if (!match) return null;

  const week = Number(match[1]);
  if (!Number.isInteger(week) || week < 1 || week > 53) {
    return null;
  }

  return week;
}

export function formatGroceryLogEntry(text: string, week: number): string {
  const body = text.trim();
  if (!body) return "";
  return `- ${week} — ${body}`;
}

export function parseGroceryLogEntry(text: string): { week: number; body: string } | null {
  const match = text.trim().match(/^-\s*(\d{1,2})\s*—\s*(.+)$/);
  if (!match) return null;
  const week = Number(match[1]);
  if (!Number.isInteger(week) || week < 1 || week > 53) return null;
  return { week, body: match[2].trim() };
}
