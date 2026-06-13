/**
 * Date-range resolution for period selectors (shared with workouts filter).
 */
import {
  addMonthsIso,
  endOfMonth,
  parseDateIso,
  startOfMonth,
  todayIso,
} from './dateFormat';
import type { DateRange, Period } from './periodTypes';

export function yearBounds(year: number): DateRange {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

function clampRangeToYear(range: DateRange, year: number): DateRange {
  const { start: ys, end: ye } = yearBounds(year);
  const start = range.start < ys ? ys : range.start;
  const end = range.end > ye ? ye : range.end;
  if (start > end) return { start: ys, end: ys };
  return { start, end };
}

function sameCalendarDateInYear(iso: string, targetYear: number): string {
  const normalized = parseDateIso(iso);
  if (!normalized) return `${targetYear}-01-01`;
  const md = normalized.slice(5);
  const candidate = `${targetYear}${md}`;
  if (parseDateIso(candidate)) return candidate;
  const month = normalized.slice(5, 7);
  const fromDay = Number(normalized.slice(8, 10));
  const startDay = Number.isFinite(fromDay) ? Math.min(31, Math.max(1, fromDay)) : 31;
  for (let day = startDay; day >= 1; day--) {
    const fallback = `${targetYear}-${month}-${String(day).padStart(2, '0')}`;
    if (parseDateIso(fallback)) return fallback;
  }
  return `${targetYear}-01-01`;
}

function resolveCustomRangeInYear(range: DateRange, year: number): DateRange {
  const ys = `${year}-01-01`;
  const ye = `${year}-12-31`;
  const end = range.end > ye ? ye : range.end;
  if (end < ys) return { start: ys, end: ys };
  if (range.start > ye) return { start: ys, end: ys };

  const intersectionStart = range.start < ys ? ys : range.start;
  const rolledStart = range.start < ys ? sameCalendarDateInYear(range.start, year) : range.start;

  const start =
    rolledStart > end ? intersectionStart : rolledStart > intersectionStart ? rolledStart : intersectionStart;

  if (start > end) return { start: ys, end: ys };
  return { start, end };
}

export function resolveDateRange(
  period: Period,
  selectedYear: number,
  today: string = todayIso(),
): DateRange {
  const cy = Number(today.slice(0, 4));
  let r: DateRange;
  switch (period.kind) {
    case 'full-year':
      r = yearBounds(selectedYear);
      break;
    case 'this-month': {
      r = { start: startOfMonth(today), end: endOfMonth(today) };
      break;
    }
    case 'last-month': {
      const lastMonthStart = addMonthsIso(startOfMonth(today), -1);
      r = { start: lastMonthStart, end: endOfMonth(lastMonthStart) };
      break;
    }
    case 'ytd':
      if (selectedYear === cy) {
        r = { start: `${selectedYear}-01-01`, end: today };
      } else {
        r = yearBounds(selectedYear);
      }
      break;
    case 'q1':
      r = { start: `${selectedYear}-01-01`, end: `${selectedYear}-03-31` };
      break;
    case 'q2':
      r = { start: `${selectedYear}-04-01`, end: `${selectedYear}-06-30` };
      break;
    case 'q3':
      r = { start: `${selectedYear}-07-01`, end: `${selectedYear}-09-30` };
      break;
    case 'q4':
      r = { start: `${selectedYear}-10-01`, end: `${selectedYear}-12-31` };
      break;
    case 'custom': {
      r = {
        start: period.customStart ?? `${selectedYear}-01-01`,
        end: period.customEnd ?? `${selectedYear}-12-31`,
      };
      return resolveCustomRangeInYear(r, selectedYear);
    }
  }
  return clampRangeToYear(r, selectedYear);
}

export function previousDateRange(
  period: Period,
  range: DateRange,
  selectedYear: number,
  today: string = todayIso(),
): DateRange {
  const cy = Number(today.slice(0, 4));
  switch (period.kind) {
    case 'full-year':
      return yearBounds(selectedYear - 1);
    case 'ytd':
      if (selectedYear === cy) {
        const md = today.slice(5, 10);
        return { start: `${selectedYear - 1}-01-01`, end: `${selectedYear - 1}-${md}` };
      }
      return yearBounds(selectedYear - 1);
    case 'q1':
      return { start: `${selectedYear - 1}-01-01`, end: `${selectedYear - 1}-03-31` };
    case 'q2':
      return { start: `${selectedYear - 1}-04-01`, end: `${selectedYear - 1}-06-30` };
    case 'q3':
      return { start: `${selectedYear - 1}-07-01`, end: `${selectedYear - 1}-09-30` };
    case 'q4':
      return { start: `${selectedYear - 1}-10-01`, end: `${selectedYear - 1}-12-31` };
    case 'this-month': {
      const lastMonthStart = addMonthsIso(startOfMonth(today), -1);
      return { start: lastMonthStart, end: endOfMonth(lastMonthStart) };
    }
    case 'last-month': {
      const lastMonthStart = addMonthsIso(startOfMonth(today), -1);
      const prevStart = addMonthsIso(lastMonthStart, -1);
      return { start: prevStart, end: endOfMonth(prevStart) };
    }
    case 'custom': {
      const prevStart = addMonthsIso(range.start, -12);
      const prevEnd = addMonthsIso(range.end, -12);
      return clampRangeToYear({ start: prevStart, end: prevEnd }, selectedYear - 1);
    }
  }
}

export function calendarMonthsInRange(range: DateRange): number {
  const [y1, m1] = range.start.split('-').map(Number);
  const [y2, m2] = range.end.split('-').map(Number);
  if (!y1 || !y2) return 0;
  return (y2 - y1) * 12 + (m2 - m1) + 1;
}
