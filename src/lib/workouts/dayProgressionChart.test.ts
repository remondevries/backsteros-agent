import { describe, expect, test } from 'bun:test';
import {
  buildDayMuscleSetCountLineSeries,
  dayProgressionLookbackRange,
  forwardFillMuscleDaySetSeries,
  muscleGroupsTrainedOnDate,
} from './dayProgressionChart';
import type { WorkoutSet } from './types';

describe('dayProgressionLookbackRange', () => {
  test('returns 14 inclusive days ending on anchor', () => {
    expect(dayProgressionLookbackRange('2026-05-24')).toEqual({
      start: '2026-05-11',
      end: '2026-05-24',
    });
  });
});

describe('muscleGroupsTrainedOnDate', () => {
  test('returns groups only from the anchor day', () => {
    const rows: WorkoutSet[] = [
      {
        date: '2026-05-24',
        exercise: 'Bench',
        muscleGroup: 'Chest',
        reps: 5,
        weight: 80,
        setNumber: 1,
        detail: '',
        isBodyweight: false,
      },
      {
        date: '2026-05-23',
        exercise: 'Row',
        muscleGroup: 'Back',
        reps: 8,
        weight: 60,
        setNumber: 1,
        detail: '',
        isBodyweight: false,
      },
      {
        date: '2026-05-24',
        exercise: 'Curl',
        muscleGroup: 'Biceps',
        reps: 10,
        weight: 20,
        setNumber: 1,
        detail: '',
        isBodyweight: false,
      },
    ];
    expect(muscleGroupsTrainedOnDate(rows, '2026-05-24')).toEqual(['Chest', 'Biceps']);
  });
});

describe('forwardFillMuscleDaySetSeries', () => {
  test('carries last set count across rest days and null before first workout', () => {
    expect(forwardFillMuscleDaySetSeries([0, 0, 6, 0, 0, 12, 0])).toEqual([
      null,
      null,
      6,
      6,
      6,
      12,
      12,
    ]);
  });
});

describe('buildDayMuscleSetCountLineSeries', () => {
  test('fills every day in range with set counts including zero days', () => {
    const rows: WorkoutSet[] = [
      {
        date: '2026-05-20',
        exercise: 'Bench',
        muscleGroup: 'Chest',
        setNumber: 1,
        reps: 5,
        weight: 80,
        detail: '',
        isBodyweight: false,
      },
      {
        date: '2026-05-20',
        exercise: 'Bench',
        muscleGroup: 'Chest',
        setNumber: 2,
        reps: 5,
        weight: 80,
        detail: '',
        isBodyweight: false,
      },
      {
        date: '2026-05-24',
        exercise: 'Bench',
        muscleGroup: 'Chest',
        setNumber: 1,
        reps: 3,
        weight: 90,
        detail: '',
        isBodyweight: false,
      },
    ];
    const range = dayProgressionLookbackRange('2026-05-24');
    const series = buildDayMuscleSetCountLineSeries(rows, ['Chest'], range);
    expect(series.keys).toHaveLength(14);
    expect(series.rawByMuscle?.get('Chest')?.slice(-7)).toEqual([0, 0, 2, 0, 0, 0, 1]);
    expect(series.byMuscle.get('Chest')?.slice(-7)).toEqual([null, null, 2, 2, 2, 2, 1]);
  });
});
