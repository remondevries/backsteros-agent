/**
 * Pure helpers for all-time personal records (compare, merge, format).
 */
import { canonicalExerciseName } from './exerciseCatalog';
import type { PersonalRecord, WorkoutSet } from './types';

export type PersonalRecordBeat = 'weight' | 'reps';

/** Canonical exercise key for PR rows (catalog name when known). */
export function personalRecordExerciseKey(exercise: string): string {
  const trimmed = exercise.trim();
  if (!trimmed) return '';
  return canonicalExerciseName(trimmed) ?? trimmed;
}

function setMatchesPersonalRecordKey(set: WorkoutSet, exerciseKey: string): boolean {
  return personalRecordExerciseKey(set.exercise) === exerciseKey;
}

export function computePersonalRecordFromSets(
  exerciseKey: string,
  sets: WorkoutSet[],
): PersonalRecord | null {
  const matching = sets.filter((set) => setMatchesPersonalRecordKey(set, exerciseKey));
  if (matching.length === 0) return null;

  let maxWeight = 0;
  let repsAtMax = 0;
  let maxWeightDate = '';
  let bestReps = 0;
  let bestRepsDate = '';

  for (const set of matching) {
    if (set.reps > bestReps) {
      bestReps = set.reps;
      bestRepsDate = set.date;
    }
    if (set.isBodyweight || set.weight <= 0) continue;
    if (set.weight > maxWeight || (set.weight === maxWeight && set.reps > repsAtMax)) {
      maxWeight = set.weight;
      repsAtMax = set.reps;
      maxWeightDate = set.date;
    }
  }

  if (maxWeight <= 0 && bestReps <= 0) return null;

  return {
    exercise: exerciseKey,
    maxWeight,
    reps: repsAtMax,
    date: maxWeightDate || bestRepsDate,
    bestReps,
    bestRepsDate: bestRepsDate || maxWeightDate,
  };
}

export function compareSetToRecord(
  set: WorkoutSet,
  record: PersonalRecord | null | undefined,
): PersonalRecordBeat | null {
  if (set.reps <= 0) return null;
  if (!record) {
    if (set.isBodyweight || set.weight <= 0) return 'reps';
    return set.weight > 0 ? 'weight' : null;
  }

  if (set.isBodyweight || set.weight <= 0) {
    return set.reps > record.bestReps ? 'reps' : null;
  }

  if (set.weight > record.maxWeight) return 'weight';
  if (set.weight === record.maxWeight && set.reps > record.reps) return 'weight';
  return null;
}

export function applySetBeatToRecord(
  record: PersonalRecord,
  set: WorkoutSet,
  beat: PersonalRecordBeat,
): PersonalRecord {
  if (beat === 'weight') {
    return {
      ...record,
      maxWeight: set.weight,
      reps: set.reps,
      date: set.date,
      bestReps: Math.max(record.bestReps, set.reps),
      bestRepsDate: set.reps >= record.bestReps ? set.date : record.bestRepsDate,
    };
  }
  return {
    ...record,
    bestReps: set.reps,
    bestRepsDate: set.date,
  };
}

export function mergePersonalRecords(a: PersonalRecord, b: PersonalRecord): PersonalRecord {
  const sets: WorkoutSet[] = [];
  if (a.maxWeight > 0) {
    sets.push({
      date: a.date,
      exercise: a.exercise,
      muscleGroup: '',
      setNumber: 1,
      reps: a.reps,
      weight: a.maxWeight,
      detail: '',
      isBodyweight: false,
    });
  }
  if (b.maxWeight > 0) {
    sets.push({
      date: b.date,
      exercise: b.exercise,
      muscleGroup: '',
      setNumber: 1,
      reps: b.reps,
      weight: b.maxWeight,
      detail: '',
      isBodyweight: false,
    });
  }
  if (a.bestReps > 0) {
    sets.push({
      date: a.bestRepsDate,
      exercise: a.exercise,
      muscleGroup: '',
      setNumber: 1,
      reps: a.bestReps,
      weight: 0,
      detail: '',
      isBodyweight: true,
    });
  }
  if (b.bestReps > 0) {
    sets.push({
      date: b.bestRepsDate,
      exercise: b.exercise,
      muscleGroup: '',
      setNumber: 1,
      reps: b.bestReps,
      weight: 0,
      detail: '',
      isBodyweight: true,
    });
  }
  return computePersonalRecordFromSets(a.exercise, sets)!;
}

export function formatPersonalRecordLabel(record: PersonalRecord): string {
  if (record.maxWeight > 0) {
    const w =
      Number.isInteger(record.maxWeight) ? String(record.maxWeight) : String(record.maxWeight);
    return `PR ${record.reps}×${w}`;
  }
  if (record.bestReps > 0) return `PR ${record.bestReps} reps`;
  return '';
}

export function formatNewPersonalRecordNotice(set: WorkoutSet, beat: PersonalRecordBeat): string {
  const name = set.exercise.trim() || 'Exercise';
  if (beat === 'reps' || set.isBodyweight || set.weight <= 0) {
    return `New PR — ${name} ${set.reps} reps`;
  }
  const w = Number.isInteger(set.weight) ? String(set.weight) : String(set.weight);
  return `New PR — ${name} ${set.reps}×${w}`;
}

export function setMatchesPersonalRecord(set: WorkoutSet, record: PersonalRecord): boolean {
  if (set.isBodyweight || set.weight <= 0) {
    return set.reps === record.bestReps && set.date === record.bestRepsDate;
  }
  return set.weight === record.maxWeight && set.reps === record.reps && set.date === record.date;
}

/** 0–100: how close this set's weight is to the stored max-weight PR (100 = at or above PR weight). */
export function personalRecordProgressPercent(
  reps: number,
  weight: number,
  isBodyweight: boolean,
  record: PersonalRecord | null | undefined,
): number | null {
  if (!record || reps <= 0) return null;
  if (isBodyweight || weight <= 0 || record.maxWeight <= 0) return null;
  return Math.min(100, Math.max(0, (weight / record.maxWeight) * 100));
}

/** 0–100: session-high weight relative to the stored max-weight PR. */
export function personalRecordSessionHighWeightPercent(
  sessionHighWeightKg: number,
  record: PersonalRecord | null | undefined,
): number | null {
  if (!record || record.maxWeight <= 0 || sessionHighWeightKg <= 0) return null;
  return Math.min(100, Math.max(0, (sessionHighWeightKg / record.maxWeight) * 100));
}

function personalRecordProgressFromSet(
  set: Pick<WorkoutSet, 'reps' | 'weight' | 'isBodyweight'>,
  record: PersonalRecord | null | undefined,
): number | null {
  return personalRecordProgressPercent(set.reps, set.weight, set.isBodyweight, record);
}

export function isAtOrAbovePersonalRecord(
  set: Pick<WorkoutSet, 'reps' | 'weight' | 'isBodyweight'>,
  record: PersonalRecord | null | undefined,
): boolean {
  if (set.reps <= 0) return false;
  if (compareSetToRecord(set as WorkoutSet, record) != null) return true;
  if (!record) return false;
  return (personalRecordProgressFromSet(set, record) ?? 0) >= 100;
}

/** True when weight alone strictly beats the stored max-weight PR (ignores rep/volume progress). */
export function exceedsPersonalRecordMaxWeight(
  weight: number,
  isBodyweight: boolean,
  record: PersonalRecord | null | undefined,
): boolean {
  if (isBodyweight || weight <= 0) return false;
  if (!record || record.maxWeight <= 0) return true;
  return weight > record.maxWeight;
}

/** Whole percent still below the PR (0 at PR, 25 when at 75% of PR). */
export function personalRecordRemovedFromPrPercent(progressPercent: number): number {
  return Math.max(0, Math.min(100, Math.round(100 - progressPercent)));
}

export function personalRecordProgressAriaLabel(
  progressPercent: number,
  atOrAbovePr: boolean,
): string {
  if (atOrAbovePr) return 'At or above personal record';
  const removed = personalRecordRemovedFromPrPercent(progressPercent);
  if (removed <= 0) return 'At personal record';
  return `${removed}% below personal record`;
}
