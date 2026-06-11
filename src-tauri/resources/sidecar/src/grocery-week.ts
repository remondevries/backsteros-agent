export type GroceryWeekContext = {
  week: number;
  year: number;
  dueDate: string;
  isCurrentWeek: boolean;
};

export function getISOWeekYear(date: Date): { week: number; year: number } {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { week, year: utc.getUTCFullYear() };
}

export function getSaturdayOfISOWeek(week: number, year: number): string {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayNum = jan4.getUTCDay() || 7;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - dayNum + 1);
  const saturday = new Date(mondayWeek1);
  saturday.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7 + 5);
  return saturday.toISOString().slice(0, 10);
}

export function formatGroceryWeekTitle(week: number): string {
  return `Week ${week}`;
}

export function formatGroceryWeekNumber(week: number): string {
  return String(week);
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

export function resolveGroceryWeekContext(
  weekInput: string | undefined,
  now = new Date(),
): GroceryWeekContext {
  const current = getISOWeekYear(now);
  const normalized = weekInput ? normalizeGroceryWeekNumber(weekInput) : null;
  const week = normalized ?? current.week;

  let year = current.year;
  if (normalized != null && normalized !== current.week) {
    if (normalized < current.week - 26) {
      year = current.year + 1;
    } else if (normalized > current.week + 26) {
      year = current.year - 1;
    }
  }

  const dueDate = getSaturdayOfISOWeek(week, year);
  const isCurrentWeek = week === current.week && year === current.year;

  return { week, year, dueDate, isCurrentWeek };
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
