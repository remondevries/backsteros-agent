import { addDaysIso, formatDayShort } from '../dateFormat';
import type { DateRange } from '../periodTypes';
import { MUSCLE_GROUPS } from './exerciseCatalog';
import type { MuscleVolumeLineSeries } from './chartSeries';
import type { WorkoutSet } from './types';

/** Inclusive lookback ending on the selected workout day (two weeks). */
export const DAY_PROGRESSION_LOOKBACK_DAYS = 14;

/** ISO date range for the last N days ending on `anchorDateKey` (inclusive). */
export function dayProgressionLookbackRange(
  anchorDateKey: string,
  lookbackDays: number = DAY_PROGRESSION_LOOKBACK_DAYS,
): DateRange {
  const days = Math.max(1, Math.trunc(lookbackDays));
  return {
    start: addDaysIso(anchorDateKey, -(days - 1)),
    end: anchorDateKey,
  };
}

function dayKeysBetween(range: DateRange): string[] {
  const keys: string[] = [];
  let cur = range.start;
  while (cur <= range.end) {
    keys.push(cur);
    cur = addDaysIso(cur, 1);
  }
  return keys;
}

/** Distinct muscle groups logged on a single workout day. */
export function muscleGroupsTrainedOnDate(rows: WorkoutSet[], dateKey: string): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.date !== dateKey) continue;
    seen.add(row.muscleGroup || 'Unknown');
  }
  return orderMuscleGroups(seen);
}

function orderMuscleGroups(seen: Iterable<string>): string[] {
  const set = seen instanceof Set ? seen : new Set(seen);
  const known = MUSCLE_GROUPS.filter((m) => set.has(m));
  const extras = Array.from(set).filter(
    (m): m is string => !MUSCLE_GROUPS.includes(m as (typeof MUSCLE_GROUPS)[number]),
  );
  return [...known, ...extras];
}

/** Raw daily set counts for one muscle across `keys`. */
function muscleSetCountsByDay(
  rows: WorkoutSet[],
  muscleGroup: string,
  keys: string[],
): number[] {
  return keys.map((key) => {
    let count = 0;
    for (const row of rows) {
      if (row.date !== key) continue;
      if ((row.muscleGroup || 'Unknown') !== muscleGroup) continue;
      count += 1;
    }
    return count;
  });
}

/**
 * Rest days (0 sets) keep the last workout day's count so the line stays flat instead of dipping to 0.
 * Days before the first logged workout stay `null` (no point).
 */
export function forwardFillMuscleDaySetSeries(values: number[]): (number | null)[] {
  let last: number | null = null;
  return values.map((v) => {
    if (v > 0) {
      last = v;
      return v;
    }
    if (last === null) return null;
    return last;
  });
}

/**
 * Daily set-count lines per muscle group for day-dashboard progression.
 * Chart values forward-fill across rest days; `rawByMuscle` keeps true counts for tooltips.
 */
export function buildDayMuscleSetCountLineSeries(
  rows: WorkoutSet[],
  muscleGroups: string[],
  range: DateRange,
): MuscleVolumeLineSeries {
  const keys = dayKeysBetween(range);
  const labels = keys.map((k) => formatDayShort(k));
  const byMuscle = new Map<string, (number | null)[]>();
  const rawByMuscle = new Map<string, number[]>();

  for (const mg of muscleGroups) {
    const raw = muscleSetCountsByDay(rows, mg, keys);
    rawByMuscle.set(mg, raw);
    byMuscle.set(mg, forwardFillMuscleDaySetSeries(raw));
  }

  return { granularity: 'day', labels, keys, byMuscle, rawByMuscle };
}
