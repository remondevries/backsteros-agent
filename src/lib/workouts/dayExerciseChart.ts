import { workoutsSetNavKey } from './workoutsSetNav';
import type { WorkoutSession } from './types';

/** One plotted set for the single-day scatter chart. */
export interface DayExerciseSetPoint {
  exercise: string;
  muscleGroup: string;
  setNumber: number;
  reps: number;
  weight: number;
  /** Matches table row nav key (`workoutsSetNavKey`). */
  setNavKey: string;
  /** Numeric x (exercise cluster + jitter between sets). */
  x: number;
  y: number;
}

export interface DayExerciseChartTick {
  x: number;
  label: string;
}

export interface DayExerciseSetChartData {
  points: DayExerciseSetPoint[];
  ticks: DayExerciseChartTick[];
  xMin: number;
  xMax: number;
}

/** Horizontal spread between sets within an exercise cluster. */
const SET_SPREAD = 0.36;
/** Gap between separate logging sessions on the same calendar day. */
const SESSION_GAP = 0.65;

function spreadOffset(index: number, count: number, span: number): number {
  if (count <= 1) return 0;
  return ((index / (count - 1)) - 0.5) * span;
}

function sessionStartMs(session: WorkoutSession): number | null {
  let earliest: number | null = null;
  for (const ex of session.exercises) {
    for (const set of ex.sets) {
      if (!set.loggedAt) continue;
      const t = Date.parse(set.loggedAt);
      if (!Number.isFinite(t)) continue;
      if (earliest == null || t < earliest) earliest = t;
    }
  }
  return earliest;
}

function sessionTimeLabel(session: WorkoutSession): string | null {
  const ms = sessionStartMs(session);
  if (ms == null) return null;
  return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function exerciseTickLabel(exercise: string, session: WorkoutSession, multiSessionDay: boolean): string {
  if (!multiSessionDay) return exercise;
  const time = sessionTimeLabel(session);
  return time ? `${exercise} · ${time}` : exercise;
}

/**
 * Build scatter points for a workout day: one dot per weighted set,
 * grouped by logging session and exercise on the x-axis with jitter between sets.
 */
export function buildDayExerciseSetChartData(sessions: WorkoutSession[]): DayExerciseSetChartData {
  const multiSessionDay = sessions.length > 1;
  const points: DayExerciseSetPoint[] = [];
  const ticks: DayExerciseChartTick[] = [];
  let baseX = 0;

  for (let si = 0; si < sessions.length; si++) {
    const session = sessions[si]!;
    if (si > 0) baseX += SESSION_GAP;

    for (const ex of session.exercises) {
      const centerX = baseX;
      ticks.push({
        x: centerX,
        label: exerciseTickLabel(ex.exercise, session, multiSessionDay),
      });

      const weightedSets = ex.sets.filter((s) => !s.isBodyweight && s.weight > 0);
      const setCount = weightedSets.length;
      weightedSets.forEach((set, setIdx) => {
        const setOffset = spreadOffset(setIdx, setCount, SET_SPREAD);
        points.push({
          exercise: ex.exercise,
          muscleGroup: ex.muscleGroup || 'Unknown',
          setNumber: set.setNumber,
          reps: set.reps,
          weight: set.weight,
          setNavKey: workoutsSetNavKey(set),
          x: centerX + setOffset,
          y: set.weight,
        });
      });

      baseX += 1;
    }
  }

  const xMin = ticks.length > 0 ? ticks[0]!.x - 0.55 : -0.5;
  const xMax = ticks.length > 0 ? ticks[ticks.length - 1]!.x + 0.55 : 0.5;

  return { points, ticks, xMin, xMax };
}
