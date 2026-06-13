import { getExerciseCatalogEntries } from "./exerciseCatalogRuntime.ts";
import type { ExerciseCatalogEntry } from "./types.ts";

export const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Legs",
  "Core",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

function catalogByName(): Map<string, ExerciseCatalogEntry> {
  const map = new Map<string, ExerciseCatalogEntry>();
  for (const entry of getExerciseCatalogEntries()) {
    map.set(entry.name.toLowerCase(), entry);
  }
  return map;
}

export function canonicalExerciseName(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  for (const entry of getExerciseCatalogEntries()) {
    if (entry.name === trimmed || entry.name.toLowerCase() === lower) return entry.name;
  }
  return null;
}

export function muscleGroupForExercise(exercise: string): MuscleGroup | "" {
  const canonical = canonicalExerciseName(exercise);
  if (!canonical) return "";
  const group = catalogByName().get(canonical.toLowerCase())?.muscleGroup ?? "";
  if (!group) return "";
  return MUSCLE_GROUPS.includes(group as MuscleGroup) ? (group as MuscleGroup) : "";
}

export function catalogExerciseNames(): string[] {
  return getExerciseCatalogEntries()
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}
