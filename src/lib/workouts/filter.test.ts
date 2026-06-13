import { describe, expect, test } from 'bun:test';
import type { WorkoutSet } from './types';
import {
  isSingleDayCustomPeriod,
  resolveDateRange,
  volumeChartGranularity,
  workoutsVisiblePeriodKinds,
} from './filter';
import { computeWorkoutsRollups, distinctWorkoutDates } from './rollups';

describe('workoutsVisiblePeriodKinds', () => {
  test('omits custom from current-year pills', () => {
    const kinds = workoutsVisiblePeriodKinds(true);
    expect(kinds).not.toContain('custom');
    expect(kinds).toContain('ytd');
  });

  test('omits custom from past-year pills', () => {
    const kinds = workoutsVisiblePeriodKinds(false);
    expect(kinds).not.toContain('custom');
    expect(kinds).toContain('full-year');
  });
});

describe('isSingleDayCustomPeriod', () => {
  test('true for matching single-day bounds', () => {
    expect(
      isSingleDayCustomPeriod({
        kind: 'custom',
        customStart: '2026-05-24',
        customEnd: '2026-05-24',
      }),
    ).toBe(true);
  });

  test('false for multi-day custom range', () => {
    expect(
      isSingleDayCustomPeriod({
        kind: 'custom',
        customStart: '2026-05-01',
        customEnd: '2026-05-24',
      }),
    ).toBe(false);
  });
});

describe('resolveDateRange (workouts)', () => {
  test('this-month caps end to today in current calendar year', () => {
    expect(resolveDateRange({ kind: 'this-month' }, 2026, '2026-05-18')).toEqual({
      start: '2026-05-01',
      end: '2026-05-18',
    });
  });

  test('this-month maps to same month in a past selected year', () => {
    expect(resolveDateRange({ kind: 'this-month' }, 2025, '2026-05-18')).toEqual({
      start: '2025-05-01',
      end: '2025-05-31',
    });
  });

  test('last-month uses previous calendar month in selected year', () => {
    expect(resolveDateRange({ kind: 'last-month' }, 2026, '2026-05-18')).toEqual({
      start: '2026-04-01',
      end: '2026-04-30',
    });
  });
});

describe('distinctWorkoutDates', () => {
  test('returns all session dates in rows', () => {
    const rows = [
      { date: '2026-05-04', exercise: 'A', muscleGroup: '', setNumber: 1, reps: 1, weight: 10, detail: '', isBodyweight: false },
      { date: '2026-05-01', exercise: 'B', muscleGroup: '', setNumber: 1, reps: 1, weight: 10, detail: '', isBodyweight: false },
      { date: '2026-05-04', exercise: 'C', muscleGroup: '', setNumber: 2, reps: 1, weight: 10, detail: '', isBodyweight: false },
    ] as const;
    expect(distinctWorkoutDates([...rows])).toEqual(['2026-05-01', '2026-05-04']);
  });
});

describe('volumeChartGranularity', () => {
  test('this-month uses per-workout bars', () => {
    expect(
      volumeChartGranularity({ kind: 'this-month' }, { start: '2026-05-01', end: '2026-05-18' })
    ).toBe('day');
  });

  test('full-year uses monthly lines', () => {
    expect(
      volumeChartGranularity({ kind: 'full-year' }, { start: '2026-01-01', end: '2026-12-31' })
    ).toBe('month');
  });

  test('ytd uses monthly lines', () => {
    expect(
      volumeChartGranularity({ kind: 'ytd' }, { start: '2026-01-01', end: '2026-06-03' })
    ).toBe('month');
  });
});

describe('computeWorkoutsRollups volume buckets', () => {
  const rows: WorkoutSet[] = [
    {
      date: '2026-05-01',
      exercise: 'Bench press',
      muscleGroup: 'Chest',
      setNumber: 1,
      reps: 10,
      weight: 40,
      detail: '',
      isBodyweight: false,
    },
    {
      date: '2026-05-04',
      exercise: 'Bench press',
      muscleGroup: 'Chest',
      setNumber: 1,
      reps: 8,
      weight: 50,
      detail: '',
      isBodyweight: false,
    },
    {
      date: '2026-05-06',
      exercise: 'Bench press',
      muscleGroup: 'Chest',
      setNumber: 1,
      reps: 8,
      weight: 50,
      detail: '',
      isBodyweight: false,
    },
  ];

  test('day granularity yields one bar per session date', () => {
    const { weekBuckets, kpis } = computeWorkoutsRollups(rows, { volumeGranularity: 'day' });
    expect(kpis.workouts).toBe(3);
    expect(weekBuckets).toHaveLength(3);
    expect(weekBuckets.map((b) => b.weekStart)).toEqual([
      '2026-05-01',
      '2026-05-04',
      '2026-05-06',
    ]);
  });

  test('week granularity merges same ISO week', () => {
    const { weekBuckets, kpis } = computeWorkoutsRollups(rows, { volumeGranularity: 'week' });
    expect(kpis.workouts).toBe(3);
    expect(weekBuckets).toHaveLength(2);
    expect(weekBuckets.map((b) => b.weekStart)).toEqual(['2026-04-27', '2026-05-04']);
  });

  test('month granularity merges by calendar month', () => {
    const { weekBuckets } = computeWorkoutsRollups(rows, { volumeGranularity: 'month' });
    expect(weekBuckets).toHaveLength(1);
    expect(weekBuckets[0]!.weekStart).toBe('2026-05');
    expect(weekBuckets[0]!.totalVolume).toBe(10 * 40 + 8 * 50 + 8 * 50);
  });
});
