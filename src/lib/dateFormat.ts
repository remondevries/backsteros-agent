/**
 * Date parsing/formatting helpers for workouts analytics and shared period logic.
 */

/** ISO 8601 week: week 1 is the week containing the year's first Thursday. */
function getISOWeekYearAndWeek(date: Date): { year: number; week: number } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const year = d.getFullYear();
  return { year, week };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Today's date as ISO YYYY-MM-DD in local time. */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** First day of the month containing `iso`. */
export function startOfMonth(iso: string): string {
  return iso.slice(0, 7) + '-01';
}

/** Last day of the month containing `iso`. */
export function endOfMonth(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${pad2(m)}-${pad2(last)}`;
}

/** Add `n` calendar days to an ISO date. */
export function addDaysIso(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + n);
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/** Add `n` months to the ISO month part (clamps day to the new month's last day). */
export function addMonthsIso(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const total = (y * 12 + (m - 1)) + n;
  const newY = Math.floor(total / 12);
  const newM = (total % 12) + 1;
  const lastDay = new Date(Date.UTC(newY, newM, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  return `${newY}-${pad2(newM)}-${pad2(day)}`;
}

/** "Mar 2026" — short month + year. */
export function formatMonthShort(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  if (!y || !m) return yyyymm;
  try {
    const d = new Date(Date.UTC(y, m - 1, 1));
    return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d);
  } catch {
    return yyyymm;
  }
}

/** "9 May" — day + short month for table rows. */
export function formatDayShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  try {
    const date = new Date(Date.UTC(y, m - 1, d));
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date);
  } catch {
    return iso;
  }
}

export function isoBetween(d: string, start: string, end: string): boolean {
  return d >= start && d <= end;
}

/** ISO week key: `YYYY-Www` (week 01–53). */
export function isoWeekKey(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const { year, week } = getISOWeekYearAndWeek(new Date(y, m - 1, d));
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Monday and Sunday (ISO) for a week key, as ISO dates in local time. */
export function isoWeekBounds(weekKey: string): { start: string; end: string } {
  const m = weekKey.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return { start: weekKey, end: weekKey };
  const isoYear = Number(m[1]);
  const week = Number(m[2]);
  const thursday = new Date(isoYear, 0, 4);
  const dow = thursday.getDay() || 7;
  const mondayW1 = new Date(thursday);
  mondayW1.setDate(thursday.getDate() - dow + 1);
  const monday = new Date(mondayW1);
  monday.setDate(mondayW1.getDate() + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const toIso = (d: Date) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  return { start: toIso(monday), end: toIso(sunday) };
}

/** Split ISO week range labels for table group headers. */
export function formatWeekRangeParts(weekKey: string): { start: string; end: string } {
  const { start, end } = isoWeekBounds(weekKey);
  return { start: formatDayShort(start), end: formatDayShort(end) };
}

/** "4 May → 10 May" — ISO week range for table group headers. */
export function formatWeekRangeLabel(weekKey: string): string {
  const { start, end } = formatWeekRangeParts(weekKey);
  if (start === end) return start;
  return `${start} → ${end}`;
}

/** Parse ISO YYYY-MM-DD; returns empty string when unparseable. */
export function parseDateIso(input: string): string {
  if (!input) return '';
  const s = input.trim();
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return '';
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return '';
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return '';
  return `${year}-${pad2(month)}-${pad2(day)}`;
}
