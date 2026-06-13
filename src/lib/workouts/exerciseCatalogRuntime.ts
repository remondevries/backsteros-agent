import type { ExerciseCatalogEntry } from './types';
import { DEFAULT_EXERCISE_CATALOG_ENTRIES } from './exerciseCatalogDefault';

let currentEntries: ExerciseCatalogEntry[] = [...DEFAULT_EXERCISE_CATALOG_ENTRIES];

export function getExerciseCatalogEntries(): readonly ExerciseCatalogEntry[] {
  return currentEntries;
}

export function setExerciseCatalogEntries(entries: ExerciseCatalogEntry[]): void {
  currentEntries = entries.length > 0 ? [...entries] : [...DEFAULT_EXERCISE_CATALOG_ENTRIES];
}
