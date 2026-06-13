import { describe, expect, test } from 'bun:test';
import { computeWorkoutsRollups, workoutSessionsForDayDetail } from './rollups';
import type { WorkoutSet } from './types';

function set(partial: Partial<WorkoutSet> & Pick<WorkoutSet, 'exercise' | 'setNumber'>): WorkoutSet {
  return {
    date: '2026-05-24',
    muscleGroup: '',
    reps: 5,
    weight: 50,
    detail: '',
    isBodyweight: false,
    ...partial,
  };
}

describe('computeWorkoutsRollups session UI order', () => {
  test('orders exercises and sets newest-first within a session', () => {
    const rows: WorkoutSet[] = [
      set({
        exercise: 'Alpha',
        setNumber: 1,
        loggedAt: '2026-05-24T09:00:00+02:00',
      }),
      set({
        exercise: 'Beta',
        setNumber: 1,
        loggedAt: '2026-05-24T11:00:00+02:00',
      }),
      set({
        exercise: 'Alpha',
        setNumber: 2,
        loggedAt: '2026-05-24T10:00:00+02:00',
      }),
      set({
        exercise: 'Beta',
        setNumber: 2,
        loggedAt: '2026-05-24T08:00:00+02:00',
      }),
    ];

    const { sessions } = computeWorkoutsRollups(rows);
    expect(sessions).toHaveLength(1);
    const session = sessions[0]!;
    expect(session.exercises.map((e) => e.exercise)).toEqual(['Beta', 'Alpha']);
    expect(session.exercises[0]!.sets.map((s) => s.setNumber)).toEqual([1, 2]);
    expect(session.exercises[1]!.sets.map((s) => s.setNumber)).toEqual([2, 1]);
  });

  test('keeps sessions newest-first by date', () => {
    const rows: WorkoutSet[] = [
      set({ date: '2026-05-20', exercise: 'Old', setNumber: 1 }),
      set({ date: '2026-05-24', exercise: 'New', setNumber: 1 }),
    ];
    const { sessions } = computeWorkoutsRollups(rows);
    expect(sessions.map((s) => s.date)).toEqual(['2026-05-24', '2026-05-20']);
  });
});

describe('computeWorkoutsRollups includeSessions', () => {
  test('skips session assembly when includeSessions is false', () => {
    const rows: WorkoutSet[] = [
      set({ exercise: 'Bench', setNumber: 1, date: '2026-05-01' }),
      set({ exercise: 'Squat', setNumber: 1, date: '2026-05-02' }),
    ];
    const rollups = computeWorkoutsRollups(rows, { includeSessions: false });
    expect(rollups.kpis.workouts).toBe(2);
    expect(rollups.sessions).toEqual([]);
    expect(rollups.exercises).toEqual(['Bench', 'Squat']);
  });
});

describe('workoutSessionsForDayDetail', () => {
  test('returns the same session when logged-at gaps are within the threshold', () => {
    const rows: WorkoutSet[] = [
      set({ exercise: 'Bench', setNumber: 1, loggedAt: '2026-05-24T09:00:00+02:00' }),
      set({ exercise: 'Bench', setNumber: 2, loggedAt: '2026-05-24T10:30:00+02:00' }),
    ];
    const { sessions } = computeWorkoutsRollups(rows);
    expect(workoutSessionsForDayDetail(sessions[0]!)).toHaveLength(1);
  });

  test('splits same-day sets into multiple logging sessions after a long gap', () => {
    const rows: WorkoutSet[] = [
      set({ exercise: 'Bench', setNumber: 1, loggedAt: '2026-05-24T09:00:00+02:00' }),
      set({ exercise: 'Squat', setNumber: 1, loggedAt: '2026-05-24T18:00:00+02:00' }),
    ];
    const { sessions } = computeWorkoutsRollups(rows);
    const parts = workoutSessionsForDayDetail(sessions[0]!);
    expect(parts).toHaveLength(2);
    expect(parts[0]!.exercises.map((e) => e.exercise)).toEqual(['Squat']);
    expect(parts[1]!.exercises.map((e) => e.exercise)).toEqual(['Bench']);
  });
});
