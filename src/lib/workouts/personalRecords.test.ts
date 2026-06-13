import { describe, expect, test } from 'bun:test';
import {
  applySetBeatToRecord,
  compareSetToRecord,
  computePersonalRecordFromSets,
  formatNewPersonalRecordNotice,
  formatPersonalRecordLabel,
  exceedsPersonalRecordMaxWeight,
  isAtOrAbovePersonalRecord,
  mergePersonalRecords,
  personalRecordExerciseKey,
  personalRecordProgressPercent,
  personalRecordRemovedFromPrPercent,
  personalRecordSessionHighWeightPercent,
  setMatchesPersonalRecord,
} from './personalRecords';
import type { PersonalRecord, WorkoutSet } from './types';

function sampleSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    date: '2026-05-24',
    exercise: 'Bench press',
    muscleGroup: 'Chest',
    setNumber: 1,
    reps: 10,
    weight: 40,
    detail: '',
    isBodyweight: false,
    ...overrides,
  };
}

describe('personalRecordExerciseKey', () => {
  test('uses catalog canonical casing when name matches', () => {
    expect(personalRecordExerciseKey('bench press')).toBe('Bench press');
  });

  test('keeps distinct storage names', () => {
    expect(personalRecordExerciseKey('Leg press (3)')).toBe('Leg press (3)');
  });
});

describe('isAtOrAbovePersonalRecord', () => {
  test('true for first-ever valid set with no stored record', () => {
    expect(isAtOrAbovePersonalRecord(sampleSet({ weight: 80, reps: 8 }), null)).toBe(true);
  });

  test('false for invalid reps', () => {
    expect(isAtOrAbovePersonalRecord(sampleSet({ reps: 0 }), null)).toBe(false);
  });

  test('true when matching or beating stored PR', () => {
    const record: PersonalRecord = {
      exercise: 'Bench press',
      maxWeight: 100,
      reps: 5,
      date: '2026-01-01',
      bestReps: 10,
      bestRepsDate: '2026-01-01',
    };
    expect(isAtOrAbovePersonalRecord(sampleSet({ weight: 100, reps: 5 }), record)).toBe(true);
    expect(isAtOrAbovePersonalRecord(sampleSet({ weight: 105, reps: 3 }), record)).toBe(true);
    expect(isAtOrAbovePersonalRecord(sampleSet({ weight: 100, reps: 4 }), record)).toBe(true);
    expect(isAtOrAbovePersonalRecord(sampleSet({ weight: 95, reps: 10 }), record)).toBe(false);
  });
});

describe('exceedsPersonalRecordMaxWeight', () => {
  const record: PersonalRecord = {
    exercise: 'Bench press',
    maxWeight: 100,
    reps: 5,
    date: '2026-01-01',
    bestReps: 10,
    bestRepsDate: '2026-01-01',
  };

  test('true when weight strictly exceeds stored max', () => {
    expect(exceedsPersonalRecordMaxWeight(105, false, record)).toBe(true);
    expect(exceedsPersonalRecordMaxWeight(100, false, record)).toBe(false);
    expect(exceedsPersonalRecordMaxWeight(99, false, record)).toBe(false);
  });

  test('false for bodyweight or invalid weight', () => {
    expect(exceedsPersonalRecordMaxWeight(0, true, record)).toBe(false);
    expect(exceedsPersonalRecordMaxWeight(0, false, record)).toBe(false);
  });

  test('true for first weighted entry with no stored record', () => {
    expect(exceedsPersonalRecordMaxWeight(80, false, null)).toBe(true);
  });
});

describe('compareSetToRecord', () => {
  test('detects higher weight PR', () => {
    const record: PersonalRecord = {
      exercise: 'Bench press',
      maxWeight: 100,
      reps: 5,
      date: '2026-01-01',
      bestReps: 10,
      bestRepsDate: '2026-01-01',
    };
    expect(compareSetToRecord(sampleSet({ weight: 105, reps: 3 }), record)).toBe('weight');
    expect(compareSetToRecord(sampleSet({ weight: 100, reps: 6 }), record)).toBe('weight');
    expect(compareSetToRecord(sampleSet({ weight: 100, reps: 5 }), record)).toBeNull();
  });

  test('detects bodyweight reps PR', () => {
    const record: PersonalRecord = {
      exercise: 'Pull up',
      maxWeight: 0,
      reps: 0,
      date: '',
      bestReps: 12,
      bestRepsDate: '2026-01-01',
    };
    expect(
      compareSetToRecord(
        sampleSet({ exercise: 'Pull up', weight: 0, isBodyweight: true, reps: 15 }),
        record
      )
    ).toBe('reps');
  });
});

describe('computePersonalRecordFromSets', () => {
  test('picks heaviest weight with rep tiebreak', () => {
    const record = computePersonalRecordFromSets('Bench press', [
      sampleSet({ weight: 80, reps: 8, date: '2026-05-01' }),
      sampleSet({ weight: 90, reps: 5, date: '2026-05-24' }),
      sampleSet({ weight: 90, reps: 6, date: '2026-05-25' }),
    ]);
    expect(record).toEqual({
      exercise: 'Bench press',
      maxWeight: 90,
      reps: 6,
      date: '2026-05-25',
      bestReps: 8,
      bestRepsDate: '2026-05-01',
    });
  });
});

describe('mergePersonalRecords', () => {
  test('keeps the better weight and reps from both records', () => {
    const merged = mergePersonalRecords(
      {
        exercise: 'Squat',
        maxWeight: 100,
        reps: 5,
        date: '2026-01-01',
        bestReps: 8,
        bestRepsDate: '2026-01-01',
      },
      {
        exercise: 'Squat',
        maxWeight: 90,
        reps: 8,
        date: '2026-02-01',
        bestReps: 12,
        bestRepsDate: '2026-02-01',
      }
    );
    expect(merged.maxWeight).toBe(100);
    expect(merged.reps).toBe(5);
    expect(merged.bestReps).toBe(12);
  });
});

describe('formatPersonalRecordLabel', () => {
  test('formats weighted and bodyweight labels', () => {
    expect(
      formatPersonalRecordLabel({
        exercise: 'Bench press',
        maxWeight: 122,
        reps: 10,
        date: '2026-05-24',
        bestReps: 10,
        bestRepsDate: '2026-05-24',
      })
    ).toBe('PR 10×122');
    expect(
      formatPersonalRecordLabel({
        exercise: 'Pull up',
        maxWeight: 0,
        reps: 0,
        date: '',
        bestReps: 21,
        bestRepsDate: '2026-05-24',
      })
    ).toBe('PR 21 reps');
  });
});

describe('formatNewPersonalRecordNotice', () => {
  test('formats notice copy', () => {
    expect(formatNewPersonalRecordNotice(sampleSet({ weight: 125, reps: 8 }), 'weight')).toBe(
      'New PR — Bench press 8×125'
    );
  });
});

describe('setMatchesPersonalRecord', () => {
  test('matches the stored PR set exactly', () => {
    const record: PersonalRecord = {
      exercise: 'Bench press',
      maxWeight: 100,
      reps: 5,
      date: '2026-05-24',
      bestReps: 10,
      bestRepsDate: '2026-05-24',
    };
    expect(setMatchesPersonalRecord(sampleSet({ weight: 100, reps: 5 }), record)).toBe(true);
    expect(setMatchesPersonalRecord(sampleSet({ weight: 100, reps: 4 }), record)).toBe(false);
  });
});

describe('applySetBeatToRecord', () => {
  test('updates weight PR fields', () => {
    const record: PersonalRecord = {
      exercise: 'Bench press',
      maxWeight: 100,
      reps: 5,
      date: '2026-01-01',
      bestReps: 8,
      bestRepsDate: '2026-01-01',
    };
    const next = applySetBeatToRecord(record, sampleSet({ weight: 105, reps: 3, date: '2026-06-01' }), 'weight');
    expect(next.maxWeight).toBe(105);
    expect(next.reps).toBe(3);
    expect(next.date).toBe('2026-06-01');
  });
});

describe('personalRecordProgressPercent', () => {
  const record: PersonalRecord = {
    exercise: 'Leg press',
    maxWeight: 67,
    reps: 12,
    date: '2026-01-01',
    bestReps: 12,
    bestRepsDate: '2026-01-01',
  };

  test('uses weight only vs max-weight PR', () => {
    expect(personalRecordProgressPercent(4, 10, false, record)).toBeCloseTo(14.925, 2);
    expect(personalRecordProgressPercent(6, 67, false, record)).toBe(100);
    expect(personalRecordProgressPercent(12, 67, false, record)).toBe(100);
    expect(personalRecordProgressPercent(12, 33.5, false, record)).toBe(50);
  });

  test('returns null without a record', () => {
    expect(personalRecordProgressPercent(10, 80, false, null)).toBeNull();
  });

  test('returns null for bodyweight sets', () => {
    expect(personalRecordProgressPercent(12, 0, true, record)).toBeNull();
  });
});

describe('personalRecordSessionHighWeightPercent', () => {
  const record: PersonalRecord = {
    exercise: 'Leg press',
    maxWeight: 100,
    reps: 8,
    date: '2026-01-01',
    bestReps: 8,
    bestRepsDate: '2026-01-01',
  };

  test('maps session-high weight to PR scale', () => {
    expect(personalRecordSessionHighWeightPercent(80, record)).toBe(80);
    expect(personalRecordSessionHighWeightPercent(120, record)).toBe(100);
    expect(personalRecordSessionHighWeightPercent(0, record)).toBeNull();
  });
});

describe('personalRecordRemovedFromPrPercent', () => {
  test('returns distance below PR', () => {
    expect(personalRecordRemovedFromPrPercent(85)).toBe(15);
    expect(personalRecordRemovedFromPrPercent(100)).toBe(0);
  });
});
