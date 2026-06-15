import type { LinearWorkoutSetLabel } from "./linearWorkoutTypes";

export const WORKOUT_EXERCISE_LABEL_MIN_MATCH_SCORE = 4500;

export type WorkoutExerciseLabelMatch = {
  label: LinearWorkoutSetLabel;
  score: number;
};

function normalizeExerciseQuery(raw: string): string {
  return raw.trim().toLowerCase();
}

function levenshteinRatio(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let row = 0; row < rows; row += 1) {
    matrix[row]![0] = row;
  }
  for (let col = 0; col < cols; col += 1) {
    matrix[0]![col] = col;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = a[row - 1] === b[col - 1] ? 0 : 1;
      matrix[row]![col] = Math.min(
        matrix[row - 1]![col]! + 1,
        matrix[row]![col - 1]! + 1,
        matrix[row - 1]![col - 1]! + cost,
      );
    }
  }

  const distance = matrix[a.length]![b.length]!;
  return 1 - distance / Math.max(a.length, b.length);
}

function scoreWorkoutExerciseLabelMatch(query: string, labelName: string): number {
  const normalizedQuery = normalizeExerciseQuery(query);
  const normalizedLabel = labelName.trim().toLowerCase();
  if (!normalizedQuery || !normalizedLabel) {
    return 0;
  }

  if (normalizedLabel === normalizedQuery) {
    return 10000;
  }

  if (normalizedLabel.startsWith(normalizedQuery)) {
    return 9000 + Math.round((normalizedQuery.length / normalizedLabel.length) * 500);
  }

  if (normalizedQuery.startsWith(normalizedLabel)) {
    return 8500 + Math.round((normalizedLabel.length / normalizedQuery.length) * 400);
  }

  if (normalizedLabel.includes(normalizedQuery)) {
    return 7000 + Math.min(normalizedQuery.length * 40, 400);
  }

  if (normalizedQuery.includes(normalizedLabel)) {
    return 6500 + Math.min(normalizedLabel.length * 40, 300);
  }

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const labelTokens = normalizedLabel.split(/\s+/).filter(Boolean);

  if (
    queryTokens.length > 0 &&
    queryTokens.every((token) => labelTokens.some((labelToken) => labelToken.startsWith(token)))
  ) {
    return 5200 + Math.min(queryTokens.join(" ").length * 30, 300);
  }

  if (
    queryTokens.length > 0 &&
    queryTokens.every((token) => labelTokens.some((labelToken) => labelToken.includes(token)))
  ) {
    return 4700 + Math.min(queryTokens.join(" ").length * 20, 200);
  }

  const similarity = levenshteinRatio(normalizedQuery, normalizedLabel);
  if (similarity >= 0.72) {
    return Math.round(3000 + similarity * 1000);
  }

  return 0;
}

export function findClosestWorkoutExerciseLabel(
  raw: string,
  labels: LinearWorkoutSetLabel[],
): WorkoutExerciseLabelMatch | null {
  const trimmed = raw.trim();
  if (!trimmed || labels.length === 0) {
    return null;
  }

  let best: WorkoutExerciseLabelMatch | null = null;
  for (const label of labels) {
    const name = label.name.trim();
    if (!name) {
      continue;
    }

    const score = scoreWorkoutExerciseLabelMatch(trimmed, name);
    if (score <= 0) {
      continue;
    }

    if (
      !best ||
      score > best.score ||
      (score === best.score && name.length < best.label.name.trim().length)
    ) {
      best = { label, score };
    }
  }

  if (!best || best.score < WORKOUT_EXERCISE_LABEL_MIN_MATCH_SCORE) {
    return null;
  }

  return best;
}

export function resolveWorkoutExerciseFromLabels(
  raw: string,
  labels: LinearWorkoutSetLabel[],
): { text: string; labelId: string | null; matched: boolean } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { text: "", labelId: null, matched: false };
  }

  const closest = findClosestWorkoutExerciseLabel(trimmed, labels);
  if (closest) {
    return {
      text: closest.label.name,
      labelId: closest.label.id,
      matched: true,
    };
  }

  return { text: trimmed, labelId: null, matched: false };
}

export function findLabelIdForExerciseName(
  name: string,
  labels: LinearWorkoutSetLabel[],
): string {
  return resolveWorkoutExerciseFromLabels(name, labels).labelId ?? "";
}

export function hasWorkoutExerciseLabelMatch(
  raw: string,
  labels: LinearWorkoutSetLabel[],
): boolean {
  const trimmed = raw.trim();
  if (!trimmed) {
    return true;
  }
  return findClosestWorkoutExerciseLabel(trimmed, labels) != null;
}
