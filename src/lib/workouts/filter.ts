/**
 * Date-range filtering for the workouts dashboard — Financials periods with year-aware month shortcuts.
 */
import { addMonthsIso, endOfMonth, isoBetween, startOfMonth, todayIso } from '../dateFormat';
import { calendarMonthsInRange } from '../dateRanges';
import type { DateRange, Period, PeriodKind } from '../periodTypes';
import {
  previousDateRange as financialsPreviousDateRange,
  resolveDateRange as financialsResolveDateRange,
} from '../dateRanges';
import { WORKOUTS_DATE_KEY } from './workoutDays';
import type { WorkoutSet } from './types';

export type { DateRange, Period };

/** True when period is a single-day custom range (sidebar day scope). */
export function isSingleDayCustomPeriod(period: Period): boolean {
  if (period.kind !== 'custom') return false;
  const start = period.customStart?.trim() ?? '';
  const end = period.customEnd?.trim() ?? '';
  return start === end && WORKOUTS_DATE_KEY.test(start);
}

const WORKOUTS_VISIBLE_PERIOD_KINDS: PeriodKind[] = [
  'full-year',
  'this-month',
  'last-month',
  'ytd',
  'q1',
  'q2',
  'q3',
  'q4',
];

/** Period pill kinds for workouts (no Custom range). */
export function workoutsVisiblePeriodKinds(_isCurrentCalendarYear?: boolean): PeriodKind[] {
  return [...WORKOUTS_VISIBLE_PERIOD_KINDS];
}

/**
 * Resolve period bounds for the active workouts year.
 * Month shortcuts use the same calendar month as `today` but in `selectedYear`.
 */
export function resolveDateRange(
  period: Period,
  selectedYear: number,
  today: string = todayIso(),
): DateRange {
  const cy = Number(today.slice(0, 4));
  const month = today.slice(5, 7);

  if (period.kind === 'this-month') {
    const start = `${selectedYear}-${month}-01`;
    let end = endOfMonth(start);
    if (selectedYear === cy && end > today) end = today;
    if (start > end) return { start, end: start };
    return { start, end };
  }

  if (period.kind === 'last-month') {
    const anchor =
      selectedYear === cy ? today : `${selectedYear}-${month}-${today.slice(8, 10)}`;
    const start = addMonthsIso(startOfMonth(anchor), -1);
    let end = endOfMonth(start);
    if (selectedYear === cy && end > today) end = today;
    if (start > end) return { start, end: start };
    return { start, end };
  }

  return financialsResolveDateRange(period, selectedYear, today);
}

/** Previous comparison range for KPI deltas (delegates to Financials except month shortcuts). */
export function previousDateRange(
  period: Period,
  range: DateRange,
  selectedYear: number,
  today: string = todayIso(),
): DateRange {
  if (period.kind === 'this-month' || period.kind === 'last-month') {
    const prevStart = addMonthsIso(range.start, -1);
    const prevEnd = endOfMonth(prevStart);
    return { start: prevStart, end: prevEnd };
  }
  return financialsPreviousDateRange(period, range, selectedYear, today);
}

/** Filter workout sets by inclusive ISO date range. */
export function filterWorkoutSetsByRange(rows: WorkoutSet[], range: DateRange): WorkoutSet[] {
  return rows.filter((r) => isoBetween(r.date, range.start, range.end));
}

/** Inclusive day count between two ISO dates (UTC). */
function daysInDateRange(range: DateRange): number {
  const [y1, m1, d1] = range.start.split('-').map(Number);
  const [y2, m2, d2] = range.end.split('-').map(Number);
  const start = Date.UTC(y1, m1 - 1, d1);
  const end = Date.UTC(y2, m2 - 1, d2);
  return Math.floor((end - start) / 86_400_000) + 1;
}

export type VolumeChartGranularity = 'day' | 'week' | 'month';

/**
 * Short periods use one bar per workout day so KPI session count matches the chart.
 * Year-scale views use monthly lines; mid ranges use ISO weeks.
 */
export function volumeChartGranularity(period: Period, range: DateRange): VolumeChartGranularity {
  switch (period.kind) {
    case 'this-month':
    case 'last-month':
      return 'day';
    case 'full-year':
    case 'ytd':
      return 'month';
    case 'custom': {
      const days = daysInDateRange(range);
      if (days <= 45) return 'day';
      if (calendarMonthsInRange(range) > 4) return 'month';
      return 'week';
    }
    default:
      return 'week';
  }
}
