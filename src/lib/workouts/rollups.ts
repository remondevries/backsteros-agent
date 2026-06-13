/**
 * Single-pass aggregations over `WorkoutSet[]` for the workouts dashboard.
 */
import { compareExercisesByNewestSet, sortWorkoutSetsNewestFirst } from './setsCsv';
import type { WorkoutSet, WorkoutSession, WorkoutSessionExercise } from './types';

export interface WorkoutKpis {
  /** Distinct workout dates in range. */
  workouts: number;
  /** Σ (reps × weight) across working sets (weight > 0). */
  totalVolume: number;
  /** totalVolume ÷ workouts; 0 when no workouts. */
  avgVolumePerWorkout: number;
  /** Total set count (working + bodyweight). */
  totalSets: number;
}

export interface MuscleGroupBucket {
  muscleGroup: string;
  sets: number;
  volume: number;
}

export interface WeekBucket {
  /** Bucket key: ISO date (per-session) or Monday of the ISO week. */
  weekStart: string;
  /** Per-muscle-group volume contribution for stacked bars. */
  byMuscle: Map<string, number>;
  totalVolume: number;
}

export interface ExerciseProgressionPoint {
  date: string;
  /** Heaviest weight × max reps used at that weight on this date. */
  topWeight: number;
  topReps: number;
  /** Epley estimated 1RM at the top set. */
  estimated1RM: number;
}

export interface WorkoutsRollups {
  kpis: WorkoutKpis;
  muscleGroupBuckets: MuscleGroupBucket[];
  weekBuckets: WeekBucket[];
  sessions: WorkoutSession[];
  /** Sorted list of distinct exercise names seen in the rows. */
  exercises: string[];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Volume contribution of a single set: 0 for bodyweight or non-positive weight, else reps × weight (kg). */
export function workoutSetVolume(set: Pick<WorkoutSet, 'reps' | 'weight' | 'isBodyweight'>): number {
  if (set.isBodyweight || set.weight <= 0) return 0;
  return set.reps * set.weight;
}

/** Epley estimated 1RM: weight × (1 + reps / 30). */
export function estimated1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

/** Monday of the ISO week containing `iso` (UTC), formatted YYYY-MM-DD. */
function weekStartIso(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dow);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
    date.getUTCDate(),
  ).padStart(2, '0')}`;
}

function volumeBucketKey(date: string, granularity: 'day' | 'week' | 'month'): string {
  if (granularity === 'day') return date;
  if (granularity === 'month') return date.slice(0, 7);
  return weekStartIso(date);
}

/**
 * Single-pass rollups for the dashboard.
 * `rows` is assumed to already be filtered to the target date range.
 */
export function computeWorkoutsRollups(
  rows: WorkoutSet[],
  options?: { volumeGranularity?: 'day' | 'week' | 'month'; includeSessions?: boolean },
): WorkoutsRollups {
  const volumeGranularity = options?.volumeGranularity ?? 'week';
  const includeSessions = options?.includeSessions !== false;
  const distinctDates = new Set<string>();
  let totalVolume = 0;
  let totalSets = 0;

  const muscleMap = new Map<string, MuscleGroupBucket>();
  const weekMap = new Map<string, WeekBucket>();
  const sessionMap = new Map<string, Map<string, WorkoutSet[]>>();
  const exerciseSet = new Set<string>();

  for (const set of rows) {
    distinctDates.add(set.date);
    totalSets += 1;
    const volume = workoutSetVolume(set);
    totalVolume += volume;

    const mg = set.muscleGroup || 'Unknown';
    exerciseSet.add(set.exercise);

    const muscleBucket = muscleMap.get(mg) ?? { muscleGroup: mg, sets: 0, volume: 0 };
    muscleBucket.sets += 1;
    muscleBucket.volume += volume;
    muscleMap.set(mg, muscleBucket);

    const wk = volumeBucketKey(set.date, volumeGranularity);
    const weekBucket =
      weekMap.get(wk) ?? { weekStart: wk, byMuscle: new Map<string, number>(), totalVolume: 0 };
    weekBucket.byMuscle.set(mg, (weekBucket.byMuscle.get(mg) ?? 0) + volume);
    weekBucket.totalVolume += volume;
    weekMap.set(wk, weekBucket);

    let exerciseMap = sessionMap.get(set.date);
    if (!exerciseMap) {
      exerciseMap = new Map();
      sessionMap.set(set.date, exerciseMap);
    }
    const list = exerciseMap.get(set.exercise) ?? [];
    list.push(set);
    exerciseMap.set(set.exercise, list);
  }

  const workouts = distinctDates.size;
  const kpis: WorkoutKpis = {
    workouts,
    totalVolume: round1(totalVolume),
    avgVolumePerWorkout: workouts > 0 ? round1(totalVolume / workouts) : 0,
    totalSets,
  };

  const muscleGroupBuckets = Array.from(muscleMap.values()).sort((a, b) => b.sets - a.sets);

  const weekBuckets = Array.from(weekMap.values()).sort((a, b) =>
    a.weekStart.localeCompare(b.weekStart),
  );

  const sessions: WorkoutSession[] = [];
  if (includeSessions) {
    for (const [date, exerciseMap] of sessionMap.entries()) {
      sessions.push(buildWorkoutSession(date, exerciseMap));
    }
    sessions.sort((a, b) => b.date.localeCompare(a.date));
  }

  return {
    kpis,
    muscleGroupBuckets,
    weekBuckets,
    sessions,
    exercises: Array.from(exerciseSet).sort((a, b) => a.localeCompare(b)),
  };
}

function buildWorkoutSession(
  date: string,
  exerciseMap: Map<string, WorkoutSet[]>,
): WorkoutSession {
  const exercises: WorkoutSessionExercise[] = [];
  let sessionVolume = 0;
  let sessionSets = 0;
  let topLiftDesc = '';
  let topLiftWeight = 0;
  for (const [exercise, rawSets] of exerciseMap.entries()) {
    const sets = sortWorkoutSetsNewestFirst(rawSets);
    let topW = 0;
    let topR = 0;
    let volume = 0;
    for (const s of sets) {
      sessionSets += 1;
      const v = workoutSetVolume(s);
      volume += v;
      if (s.weight > topW || (s.weight === topW && s.reps > topR)) {
        topW = s.weight;
        topR = s.reps;
      }
    }
    sessionVolume += volume;
    if (topW > topLiftWeight) {
      topLiftWeight = topW;
      topLiftDesc = `${exercise} ${topW}×${topR}`;
    }
    exercises.push({
      exercise,
      muscleGroup: sets[0]?.muscleGroup ?? '',
      sets,
      topSetWeight: topW,
      topSetReps: topR,
      volume: round1(volume),
    });
  }
  exercises.sort((a, b) => compareExercisesByNewestSet(a.sets, b.sets));
  return {
    date,
    exercises,
    totalSets: sessionSets,
    totalVolume: round1(sessionVolume),
    topLift: topLiftDesc,
  };
}

/** Gap without logged sets that starts a new logging session on the same day. */
const WORKOUT_LOGGING_SESSION_GAP_MS = 2 * 60 * 60 * 1000;

function loggedAtMs(set: WorkoutSet): number | null {
  if (!set.loggedAt) return null;
  const t = Date.parse(set.loggedAt);
  return Number.isFinite(t) ? t : null;
}

function sessionStartMs(session: WorkoutSession): number {
  let earliest = 0;
  for (const ex of session.exercises) {
    for (const set of ex.sets) {
      const ms = loggedAtMs(set);
      if (ms == null) continue;
      if (!earliest || ms < earliest) earliest = ms;
    }
  }
  return earliest;
}

/**
 * Split one calendar-day session into separate logging sessions when `Logged at`
 * gaps exceed {@link WORKOUT_LOGGING_SESSION_GAP_MS}.
 */
export function workoutSessionsForDayDetail(
  session: WorkoutSession,
  gapMs = WORKOUT_LOGGING_SESSION_GAP_MS,
): WorkoutSession[] {
  const timed: { set: WorkoutSet; ms: number }[] = [];
  const untimed: WorkoutSet[] = [];
  for (const ex of session.exercises) {
    for (const set of ex.sets) {
      const ms = loggedAtMs(set);
      if (ms == null) untimed.push(set);
      else timed.push({ set, ms });
    }
  }
  if (timed.length === 0) return [session];

  timed.sort((a, b) => a.ms - b.ms);
  const clusters: WorkoutSet[][] = [];
  let current: WorkoutSet[] = [];
  let lastMs: number | null = null;
  for (const { set, ms } of timed) {
    if (lastMs != null && ms - lastMs > gapMs) {
      clusters.push(current);
      current = [];
    }
    current.push(set);
    lastMs = ms;
  }
  if (current.length) clusters.push(current);
  if (untimed.length) {
    if (clusters.length) clusters[0]!.push(...untimed);
    else clusters.push(untimed);
  }
  if (clusters.length <= 1) return [session];

  const out = clusters.map((clusterSets) => {
    const exerciseMap = new Map<string, WorkoutSet[]>();
    for (const set of clusterSets) {
      const list = exerciseMap.get(set.exercise) ?? [];
      list.push(set);
      exerciseMap.set(set.exercise, list);
    }
    return buildWorkoutSession(session.date, exerciseMap);
  });
  out.sort((a, b) => sessionStartMs(b) - sessionStartMs(a));
  return out;
}

/** Sorted distinct session dates present in `rows`. */
export function distinctWorkoutDates(rows: WorkoutSet[]): string[] {
  const dates = new Set<string>();
  for (const r of rows) {
    if (r.date) dates.add(r.date);
  }
  return Array.from(dates).sort();
}

/**
 * Build per-date progression points for a single exercise.
 * For each date, picks the heaviest weight (tiebreak: more reps) and computes e1RM.
 */
export function exerciseProgression(
  rows: WorkoutSet[],
  exercise: string,
): ExerciseProgressionPoint[] {
  const byDate = new Map<string, { topWeight: number; topReps: number }>();
  for (const set of rows) {
    if (set.exercise !== exercise) continue;
    if (set.weight <= 0) continue;
    const cur = byDate.get(set.date);
    if (!cur || set.weight > cur.topWeight || (set.weight === cur.topWeight && set.reps > cur.topReps)) {
      byDate.set(set.date, { topWeight: set.weight, topReps: set.reps });
    }
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { topWeight, topReps }]) => ({
      date,
      topWeight,
      topReps,
      estimated1RM: round1(estimated1RM(topWeight, topReps)),
    }));
}

export interface WorkoutMonthGroup {
  /** YYYY-MM */
  month: string;
  sessions: WorkoutSession[];
  totalSessions: number;
  totalSets: number;
  totalVolume: number;
}

/** Group sessions by calendar month (newest first), with month rollups. */
export function groupWorkoutSessionsByMonth(sessions: WorkoutSession[]): WorkoutMonthGroup[] {
  const map = new Map<string, WorkoutSession[]>();
  for (const s of sessions) {
    const k = s.date.slice(0, 7);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(s);
  }
  const out: WorkoutMonthGroup[] = [];
  for (const [month, items] of map) {
    items.sort((a, b) => b.date.localeCompare(a.date));
    let totalSets = 0;
    let totalVolume = 0;
    for (const s of items) {
      totalSets += s.totalSets;
      totalVolume += s.totalVolume;
    }
    out.push({
      month,
      sessions: items,
      totalSessions: items.length,
      totalSets,
      totalVolume: round1(totalVolume),
    });
  }
  out.sort((a, b) => b.month.localeCompare(a.month));
  return out;
}
