/**
 * Exercise → muscle group map and chart colors aligned with Financials category palette.
 */
import { categorySwatchClassName } from '../categoryChartColor';
import { getExerciseCatalogEntries } from './exerciseCatalogRuntime';
import type { ExerciseCatalogEntry } from './types';

export const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Legs',
  'Core',
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export type { ExerciseCatalogEntry };

/** Hues from `categoryChartColor` / `CATEGORY_DOT_PALETTE` for visual consistency with Financials. */
const MUSCLE_GROUP_COLORS: Record<string, string> = {
  Chest: '#C0392B',
  Back: '#3498DB',
  Shoulders: '#E68A2E',
  Biceps: '#8B5CF6',
  Triceps: '#3355FF',
  Legs: '#52B788',
  Core: '#16A085',
};

function catalogByName(): Map<string, ExerciseCatalogEntry> {
  const map = new Map<string, ExerciseCatalogEntry>();
  for (const entry of getExerciseCatalogEntries()) {
    map.set(entry.name.toLowerCase(), entry);
  }
  return map;
}

/** Built-in + vault markdown catalog entries (alias phrases for description matching). */
export function exerciseCatalogEntries(): readonly ExerciseCatalogEntry[] {
  return getExerciseCatalogEntries();
}

/** Case-insensitive exact catalog name, preserving canonical casing; null if unknown. */
export function canonicalExerciseName(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  for (const entry of getExerciseCatalogEntries()) {
    if (entry.name === trimmed || entry.name.toLowerCase() === lower) return entry.name;
  }
  return null;
}

export function muscleGroupForExercise(exercise: string): MuscleGroup | '' {
  const canonical = canonicalExerciseName(exercise);
  if (!canonical) return '';
  const group = catalogByName().get(canonical.toLowerCase())?.muscleGroup ?? '';
  if (!group) return '';
  return MUSCLE_GROUPS.includes(group as MuscleGroup) ? (group as MuscleGroup) : '';
}

/** Sorted exercise names from the catalog (for logger dropdowns). */
export function catalogExerciseNames(): string[] {
  return getExerciseCatalogEntries()
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

export function muscleGroupColor(group: string): string {
  return MUSCLE_GROUP_COLORS[group] ?? 'var(--text-faint)';
}

/** Swatch class for legend dots (reuses Financials light-border handling). */
export function muscleGroupSwatchClassName(group: string, variant: 'swatch' | 'donut' = 'swatch'): string {
  return categorySwatchClassName(muscleGroupColor(group), variant);
}
