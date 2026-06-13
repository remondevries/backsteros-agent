/**
 * Pure CSV row helpers for workout sets (parse, serialize, set numbering).
 */
import { WORKOUTS_COLUMNS } from "./paths.ts";
import type { WorkoutSet } from "./types.ts";
import { muscleGroupForExercise } from "./exerciseCatalog.ts";

/** Calendar date `YYYY-MM-DD` from a `formatLoggedAt` value. */
export function dateFromLoggedAt(loggedAt: string): string {
  return loggedAt.slice(0, 10);
}

/** ISO 8601 with local timezone offset, e.g. `2026-05-19T14:32:05+02:00`. */
export function formatLoggedAt(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const oh = pad(Math.floor(abs / 60));
  const om = pad(abs % 60);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${oh}:${om}`
  );
}

/**
 * Stamp a committed set with the workout session calendar date and the actual commit clock time.
 */
export function loggedAtForWorkoutCommit(effectiveDate: Date, at: Date = new Date()): string {
  const stamped = new Date(
    effectiveDate.getFullYear(),
    effectiveDate.getMonth(),
    effectiveDate.getDate(),
    at.getHours(),
    at.getMinutes(),
    at.getSeconds(),
    at.getMilliseconds(),
  );
  return formatLoggedAt(stamped);
}

export function workoutSetFromRow(idx: Map<string, number>, row: string[]): WorkoutSet | null {
  const cell = (name: string): string => {
    const i = idx.get(name);
    return i == null ? '' : (row[i] ?? '').trim();
  };
  const date = cell('Date');
  const exercise = cell('Exercise');
  if (!date || !exercise) return null;
  const reps = Number(cell('Reps'));
  if (!Number.isFinite(reps) || reps <= 0) return null;
  const weightRaw = cell('Weight');
  const weight = weightRaw === '' ? 0 : Number(weightRaw);
  const setNumberRaw = cell('Set number');
  const setNumber = Number(setNumberRaw);
  const muscleGroupCsv = cell('Muscle group');
  const muscleGroup = muscleGroupCsv || muscleGroupForExercise(exercise) || '';
  const loggedAtRaw = cell('Logged at');
  return {
    date,
    exercise,
    muscleGroup,
    setNumber: Number.isFinite(setNumber) && setNumber > 0 ? setNumber : 1,
    reps,
    weight: Number.isFinite(weight) ? weight : 0,
    detail: cell('Detail'),
    isBodyweight: weightRaw === '',
    loggedAt: loggedAtRaw || undefined,
  };
}

export function rowFromWorkoutSet(set: WorkoutSet): string[] {
  return [
    set.date,
    set.exercise,
    set.muscleGroup,
    String(set.setNumber),
    String(set.reps),
    set.isBodyweight ? '' : String(set.weight),
    set.detail,
    set.loggedAt ?? '',
  ];
}

export function sortWorkoutSets(rows: WorkoutSet[]): WorkoutSet[] {
  return [...rows].sort((a, b) =>
    a.date === b.date
      ? a.exercise === b.exercise
        ? a.setNumber - b.setNumber
        : a.exercise.localeCompare(b.exercise)
      : a.date.localeCompare(b.date),
  );
}

/** Sort key for UI display order: higher = logged more recently. */
export function workoutSetRecency(row: WorkoutSet): number {
  if (row.loggedAt) {
    const t = Date.parse(row.loggedAt);
    if (Number.isFinite(t)) return t;
  }
  return row.setNumber;
}

/** Newest set first (UI display order). Does not reorder exercises or dates. */
export function compareWorkoutSetsNewestFirst(a: WorkoutSet, b: WorkoutSet): number {
  const diff = workoutSetRecency(b) - workoutSetRecency(a);
  if (diff !== 0) return diff;
  return b.setNumber - a.setNumber;
}

/** Copy sorted newest-first for UI lists. */
export function sortWorkoutSetsNewestFirst(rows: WorkoutSet[]): WorkoutSet[] {
  return [...rows].sort(compareWorkoutSetsNewestFirst);
}

/** Compare exercises by the recency of their newest set (for rollups / analytics). */
export function compareExercisesByNewestSet(aSets: WorkoutSet[], bSets: WorkoutSet[]): number {
  const aRecency = aSets.reduce((max, row) => Math.max(max, workoutSetRecency(row)), 0);
  const bRecency = bSets.reduce((max, row) => Math.max(max, workoutSetRecency(row)), 0);
  return bRecency - aRecency;
}

function exerciseGroupCreatedAtMs(rows: WorkoutSet[]): number {
  let minLogged = Infinity;
  for (const row of rows) {
    if (!row.loggedAt) continue;
    const t = Date.parse(row.loggedAt);
    if (Number.isFinite(t)) minLogged = Math.min(minLogged, t);
  }
  if (minLogged !== Infinity) return minLogged;
  const minSet = rows.reduce((min, row) => Math.min(min, row.setNumber), Infinity);
  return Number.isFinite(minSet) ? minSet : 0;
}

/** Compare exercises by group creation time — newest group first; stable when logging more sets. */
export function compareExercisesByCreationOrder(aSets: WorkoutSet[], bSets: WorkoutSet[]): number {
  const diff = exerciseGroupCreatedAtMs(bSets) - exerciseGroupCreatedAtMs(aSets);
  if (diff !== 0) return diff;
  const aMaxSet = aSets.reduce((max, row) => Math.max(max, row.setNumber), 0);
  const bMaxSet = bSets.reduce((max, row) => Math.max(max, row.setNumber), 0);
  return bMaxSet - aMaxSet;
}

/** Next 1-based set number for (date, exercise) given existing rows. */
export function nextSetNumber(existing: WorkoutSet[], date: string, exercise: string): number {
  let max = 0;
  for (const row of existing) {
    if (row.date === date && row.exercise === exercise && row.setNumber > max) {
      max = row.setNumber;
    }
  }
  return max + 1;
}

export { WORKOUTS_COLUMNS };
