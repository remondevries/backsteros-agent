import { describe, expect, test } from 'bun:test';
import { buildDayExerciseSetChartData } from './dayExerciseChart';
import { workoutsSetNavKey } from './workoutsSetNav';
import type { WorkoutSession, WorkoutSet } from './types';

function set(partial: Partial<WorkoutSet> & Pick<WorkoutSet, 'setNumber'>): WorkoutSet {
  return {
    date: '2026-05-22',
    exercise: 'Leg press',
    muscleGroup: 'Legs',
    reps: 5,
    weight: 300,
    detail: '',
    isBodyweight: false,
    ...partial,
  };
}

function session(
  exercises: WorkoutSession['exercises'],
  date = '2026-05-22',
): WorkoutSession {
  return {
    date,
    exercises,
    totalSets: exercises.reduce((n, e) => n + e.sets.length, 0),
    totalVolume: 0,
    topLift: '',
  };
}

describe('buildDayExerciseSetChartData', () => {
  test('emits one point per weighted set', () => {
    const row = set({ setNumber: 1, reps: 5, weight: 300 });
    const data = buildDayExerciseSetChartData([
      session([
        {
          exercise: 'Leg press',
          muscleGroup: 'Legs',
          sets: [row],
          topSetWeight: 300,
          topSetReps: 5,
          volume: 1500,
        },
      ]),
    ]);
    expect(data.ticks).toHaveLength(1);
    expect(data.ticks[0]!.label).toBe('Leg press');
    expect(data.points).toHaveLength(1);
    expect(data.points[0]).toMatchObject({
      exercise: 'Leg press',
      reps: 5,
      weight: 300,
      y: 300,
      setNavKey: workoutsSetNavKey(row),
    });
  });

  test('skips bodyweight sets', () => {
    const data = buildDayExerciseSetChartData([
      session([
        {
          exercise: 'Pull-up',
          muscleGroup: 'Back',
          sets: [set({ setNumber: 1, reps: 10, weight: 0, isBodyweight: true })],
          topSetWeight: 0,
          topSetReps: 10,
          volume: 0,
        },
      ]),
    ]);
    expect(data.points).toHaveLength(0);
  });

  test('places each exercise on its own cluster', () => {
    const data = buildDayExerciseSetChartData([
      session([
        {
          exercise: 'Bench',
          muscleGroup: 'Chest',
          sets: [set({ setNumber: 1, reps: 1, weight: 80 })],
          topSetWeight: 80,
          topSetReps: 1,
          volume: 80,
        },
        {
          exercise: 'Squat',
          muscleGroup: 'Legs',
          sets: [set({ setNumber: 1, reps: 1, weight: 100 })],
          topSetWeight: 100,
          topSetReps: 1,
          volume: 100,
        },
      ]),
    ]);
    expect(data.ticks.map((t) => t.label)).toEqual(['Bench', 'Squat']);
    const bench = data.points.find((p) => p.exercise === 'Bench')!;
    const squat = data.points.find((p) => p.exercise === 'Squat')!;
    expect(bench.x).toBeLessThan(squat.x);
  });

  test('offsets clusters when multiple logging sessions are passed', () => {
    const data = buildDayExerciseSetChartData([
      session([
        {
          exercise: 'Bench',
          muscleGroup: 'Chest',
          sets: [
            set({
              setNumber: 1,
              reps: 1,
              weight: 60,
              loggedAt: '2026-05-22T09:00:00+02:00',
            }),
          ],
          topSetWeight: 60,
          topSetReps: 1,
          volume: 60,
        },
      ]),
      session([
        {
          exercise: 'Bench',
          muscleGroup: 'Chest',
          sets: [
            set({
              setNumber: 1,
              reps: 1,
              weight: 80,
              loggedAt: '2026-05-22T18:00:00+02:00',
            }),
          ],
          topSetWeight: 80,
          topSetReps: 1,
          volume: 80,
        },
      ]),
    ]);
    expect(data.ticks).toHaveLength(2);
    expect(data.ticks[1]!.x).toBeGreaterThan(data.ticks[0]!.x + 0.5);
  });

  test('spreads multiple sets at the same weight horizontally', () => {
    const data = buildDayExerciseSetChartData([
      session([
        {
          exercise: 'Leg press',
          muscleGroup: 'Legs',
          sets: [
            set({ setNumber: 1, reps: 5, weight: 300 }),
            set({ setNumber: 2, reps: 5, weight: 300 }),
          ],
          topSetWeight: 300,
          topSetReps: 5,
          volume: 3000,
        },
      ]),
    ]);
    expect(data.points).toHaveLength(2);
    const xs = data.points.map((p) => p.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.15);
  });
});
