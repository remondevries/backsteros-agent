import { describe, expect, test } from 'bun:test';
import { indexOfHeaders, parseCsv } from '../csv/csvParse';
import { serializeCsv } from '../csv/csvSerialize';
import {
  compareExercisesByNewestSet,
  compareExercisesByCreationOrder,
  compareWorkoutSetsNewestFirst,
  dateFromLoggedAt,
  formatLoggedAt,
  loggedAtForWorkoutCommit,
  nextSetNumber,
  rowFromWorkoutSet,
  sortWorkoutSets,
  sortWorkoutSetsNewestFirst,
  workoutSetRecency,
  workoutSetFromRow,
  WORKOUTS_COLUMNS,
} from './setsCsv';
import type { WorkoutSet } from './types';

function idx(headers: string[]): Map<string, number> {
  return indexOfHeaders(headers);
}

describe('workoutSetFromRow', () => {
  test('parses row without Logged at', () => {
    const headers = ['Date', 'Exercise', 'Muscle group', 'Set number', 'Reps', 'Weight', 'Detail'];
    const row = ['2026-05-01', 'Bench press', 'Chest', '1', '10', '40', 'plus bar'];
    const set = workoutSetFromRow(idx(headers), row);
    expect(set).toEqual({
      date: '2026-05-01',
      exercise: 'Bench press',
      muscleGroup: 'Chest',
      setNumber: 1,
      reps: 10,
      weight: 40,
      detail: 'plus bar',
      isBodyweight: false,
      loggedAt: undefined,
    });
  });

  test('parses row with Logged at', () => {
    const headers = [...WORKOUTS_COLUMNS];
    const row = [
      '2026-05-01',
      'Bench press',
      'Chest',
      '2',
      '8',
      '',
      'body weight',
      '2026-05-01T14:30:00+02:00',
    ];
    const set = workoutSetFromRow(idx(headers), row);
    expect(set?.loggedAt).toBe('2026-05-01T14:30:00+02:00');
    expect(set?.isBodyweight).toBe(true);
    expect(set?.weight).toBe(0);
  });
});

describe('rowFromWorkoutSet', () => {
  test('round-trips through serializeCsv', () => {
    const set: WorkoutSet = {
      date: '2026-05-19',
      exercise: 'Leg press',
      muscleGroup: 'Legs',
      setNumber: 3,
      reps: 10,
      weight: 52,
      detail: '',
      isBodyweight: false,
      loggedAt: '2026-05-19T09:15:22+02:00',
    };
    const text = serializeCsv([...WORKOUTS_COLUMNS], [rowFromWorkoutSet(set)]);
    const parsed = parseCsv(text);
    const roundTrip = workoutSetFromRow(idx(parsed.headers), parsed.rows[0]!);
    expect(roundTrip).toEqual(set);
  });
});

describe('nextSetNumber', () => {
  test('returns 1 when no prior sets for exercise on date', () => {
    const existing: WorkoutSet[] = [
      {
        date: '2026-05-01',
        exercise: 'Other',
        muscleGroup: '',
        setNumber: 5,
        reps: 1,
        weight: 1,
        detail: '',
        isBodyweight: false,
      },
    ];
    expect(nextSetNumber(existing, '2026-05-01', 'Bench press')).toBe(1);
  });

  test('returns max + 1 for matching date and exercise', () => {
    const existing: WorkoutSet[] = [
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
        date: '2026-05-01',
        exercise: 'Bench press',
        muscleGroup: 'Chest',
        setNumber: 3,
        reps: 8,
        weight: 40,
        detail: '',
        isBodyweight: false,
      },
    ];
    expect(nextSetNumber(existing, '2026-05-01', 'Bench press')).toBe(4);
  });
});

describe('sortWorkoutSets', () => {
  test('sorts by date, exercise, set number', () => {
    const rows: WorkoutSet[] = [
      {
        date: '2026-05-02',
        exercise: 'A',
        muscleGroup: '',
        setNumber: 1,
        reps: 1,
        weight: 1,
        detail: '',
        isBodyweight: false,
      },
      {
        date: '2026-05-01',
        exercise: 'B',
        muscleGroup: '',
        setNumber: 2,
        reps: 1,
        weight: 1,
        detail: '',
        isBodyweight: false,
      },
      {
        date: '2026-05-01',
        exercise: 'A',
        muscleGroup: '',
        setNumber: 1,
        reps: 1,
        weight: 1,
        detail: '',
        isBodyweight: false,
      },
    ];
    const sorted = sortWorkoutSets(rows);
    expect(sorted.map((r) => `${r.date}:${r.exercise}:${r.setNumber}`)).toEqual([
      '2026-05-01:A:1',
      '2026-05-01:B:2',
      '2026-05-02:A:1',
    ]);
  });
});

describe('sortWorkoutSetsNewestFirst', () => {
  test('returns a newest-first copy without mutating input', () => {
    const rows: WorkoutSet[] = [
      {
        date: '2026-05-22',
        exercise: 'Bench press',
        muscleGroup: 'Chest',
        setNumber: 1,
        reps: 10,
        weight: 40,
        detail: '',
        isBodyweight: false,
        loggedAt: '2026-05-22T09:00:00+02:00',
      },
      {
        date: '2026-05-22',
        exercise: 'Bench press',
        muscleGroup: 'Chest',
        setNumber: 2,
        reps: 8,
        weight: 50,
        detail: '',
        isBodyweight: false,
        loggedAt: '2026-05-22T10:30:00+02:00',
      },
    ];
    const sorted = sortWorkoutSetsNewestFirst(rows);
    expect(sorted.map((r) => r.setNumber)).toEqual([2, 1]);
    expect(rows.map((r) => r.setNumber)).toEqual([1, 2]);
  });
});

describe('workoutSetRecency', () => {
  test('prefers loggedAt over setNumber', () => {
    const olderSetNumber: WorkoutSet = {
      date: '2026-05-22',
      exercise: 'A',
      muscleGroup: '',
      setNumber: 9,
      reps: 1,
      weight: 1,
      detail: '',
      isBodyweight: false,
      loggedAt: '2026-05-22T08:00:00+02:00',
    };
    const newerLoggedAt: WorkoutSet = {
      ...olderSetNumber,
      setNumber: 1,
      loggedAt: '2026-05-22T12:00:00+02:00',
    };
    expect(workoutSetRecency(newerLoggedAt)).toBeGreaterThan(workoutSetRecency(olderSetNumber));
  });
});

describe('compareExercisesByCreationOrder', () => {
  test('orders exercises by first set logged, not latest activity', () => {
    const alpha: WorkoutSet[] = [
      {
        date: '2026-05-24',
        exercise: 'Alpha',
        muscleGroup: '',
        setNumber: 1,
        reps: 5,
        weight: 40,
        detail: '',
        isBodyweight: false,
        loggedAt: '2026-05-24T09:00:00+02:00',
      },
      {
        date: '2026-05-24',
        exercise: 'Alpha',
        muscleGroup: '',
        setNumber: 2,
        reps: 5,
        weight: 45,
        detail: '',
        isBodyweight: false,
        loggedAt: '2026-05-24T12:00:00+02:00',
      },
    ];
    const beta: WorkoutSet[] = [
      {
        date: '2026-05-24',
        exercise: 'Beta',
        muscleGroup: '',
        setNumber: 1,
        reps: 5,
        weight: 40,
        detail: '',
        isBodyweight: false,
        loggedAt: '2026-05-24T10:00:00+02:00',
      },
    ];
    expect(compareExercisesByNewestSet(alpha, beta)).toBeLessThan(0);
    expect(compareExercisesByCreationOrder(beta, alpha)).toBeLessThan(0);
    expect(compareExercisesByCreationOrder(alpha, beta)).toBeGreaterThan(0);
  });
});

describe('compareExercisesByNewestSet', () => {
  test('orders exercises by newest contained set', () => {
    const alpha: WorkoutSet[] = [
      {
        date: '2026-05-24',
        exercise: 'Alpha',
        muscleGroup: '',
        setNumber: 1,
        reps: 5,
        weight: 40,
        detail: '',
        isBodyweight: false,
        loggedAt: '2026-05-24T09:00:00+02:00',
      },
    ];
    const beta: WorkoutSet[] = [
      {
        date: '2026-05-24',
        exercise: 'Beta',
        muscleGroup: '',
        setNumber: 1,
        reps: 5,
        weight: 40,
        detail: '',
        isBodyweight: false,
        loggedAt: '2026-05-24T11:00:00+02:00',
      },
    ];
    expect(compareExercisesByNewestSet(beta, alpha)).toBeLessThan(0);
    expect(compareExercisesByNewestSet(alpha, beta)).toBeGreaterThan(0);
  });
});

describe('compareWorkoutSetsNewestFirst', () => {
  test('orders by loggedAt descending when present', () => {
    const older: WorkoutSet = {
      date: '2026-05-22',
      exercise: 'Leg press',
      muscleGroup: 'Legs',
      setNumber: 1,
      reps: 10,
      weight: 25,
      detail: '',
      isBodyweight: false,
      loggedAt: '2026-05-22T09:00:00+02:00',
    };
    const newer: WorkoutSet = {
      ...older,
      setNumber: 2,
      reps: 8,
      weight: 30,
      loggedAt: '2026-05-22T10:30:00+02:00',
    };
    expect([older, newer].sort(compareWorkoutSetsNewestFirst)).toEqual([newer, older]);
  });

  test('falls back to setNumber descending without loggedAt', () => {
    const a: WorkoutSet = {
      date: '2026-05-22',
      exercise: 'Bench press',
      muscleGroup: 'Chest',
      setNumber: 1,
      reps: 10,
      weight: 40,
      detail: '',
      isBodyweight: false,
    };
    const b: WorkoutSet = { ...a, setNumber: 3, reps: 6, weight: 50 };
    expect([a, b].sort(compareWorkoutSetsNewestFirst)).toEqual([b, a]);
  });
});

describe('loggedAtForWorkoutCommit', () => {
  test('uses the workout calendar date with the actual commit clock time', () => {
    const effectiveDate = new Date(2026, 4, 24, 20, 29, 0, 0);
    const at = new Date(2026, 4, 24, 21, 15, 30, 500);

    const loggedAt = loggedAtForWorkoutCommit(effectiveDate, at);

    expect(loggedAt.startsWith('2026-05-24T21:15:30')).toBe(true);
  });

  test('preserves a backdated workout day while ordering by real commit time', () => {
    const effectiveDate = new Date(2026, 4, 20, 8, 0, 0, 0);
    const at = new Date(2026, 4, 24, 10, 0, 0, 0);

    const loggedAt = loggedAtForWorkoutCommit(effectiveDate, at);

    expect(loggedAt.startsWith('2026-05-20T10:00:00')).toBe(true);
  });

  test('later commits sort after earlier commits in the same session', () => {
    const effectiveDate = new Date(2026, 4, 24, 20, 29, 0, 0);
    const first = loggedAtForWorkoutCommit(
      effectiveDate,
      new Date(2026, 4, 24, 20, 29, 50, 0)
    );
    const second = loggedAtForWorkoutCommit(
      effectiveDate,
      new Date(2026, 4, 24, 20, 31, 5, 0)
    );

    expect(Date.parse(second)).toBeGreaterThan(Date.parse(first));
  });
});

describe('formatLoggedAt', () => {
  test('includes timezone offset', () => {
    const s = formatLoggedAt(new Date('2026-01-15T12:00:00Z'));
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });
});

describe('dateFromLoggedAt', () => {
  test('returns YYYY-MM-DD prefix', () => {
    expect(dateFromLoggedAt('2026-05-19T14:32:05+02:00')).toBe('2026-05-19');
  });
});
