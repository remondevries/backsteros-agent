import { describe, expect, test } from 'bun:test';
import {
  groupWorkoutSetsByDate,
  isWorkoutsDayCsvPathForYear,
  parseWorkoutDateKey,
  workoutDateKeyFromPath,
  workoutsDayPath,
} from './workoutDays';
import type { WorkoutSet } from './types';

describe('workoutDays', () => {
  test('workoutsDayPath', () => {
    expect(workoutsDayPath('2026-05-24')).toBe('Workouts/2026-05-24.csv');
  });

  test('parseWorkoutDateKey validates day range', () => {
    expect(parseWorkoutDateKey('2026-05-24')).toEqual({ year: 2026, month: 5, day: 24 });
    expect(parseWorkoutDateKey('2026-05-32')).toBeNull();
  });

  test('workoutDateKeyFromPath', () => {
    expect(workoutDateKeyFromPath('Workouts/2026-02-03.csv')).toBe('2026-02-03');
    expect(workoutDateKeyFromPath('Workouts/2026/workouts.csv')).toBeNull();
  });

  test('isWorkoutsDayCsvPathForYear', () => {
    expect(isWorkoutsDayCsvPathForYear('Workouts/2026-04-01.csv', 2026)).toBe(true);
    expect(isWorkoutsDayCsvPathForYear('Workouts/2025-04-01.csv', 2026)).toBe(false);
  });

  test('groupWorkoutSetsByDate', () => {
    const sample = (date: string): WorkoutSet => ({
      date,
      exercise: 'Squat',
      muscleGroup: 'Legs',
      setNumber: 1,
      reps: 5,
      weight: 60,
      detail: '',
      isBodyweight: false,
    });
    const grouped = groupWorkoutSetsByDate([sample('2026-01-02'), sample('2026-02-03')]);
    expect([...grouped.keys()].sort()).toEqual(['2026-01-02', '2026-02-03']);
    expect(grouped.get('2026-01-02')?.length).toBe(1);
  });
});
