import { MUSCLE_GROUPS } from './exerciseCatalog';
import type { MuscleGroupBucket } from './rollups';

export interface MuscleGroupRadarSeries {
  labels: string[];
  /** Volume per axis (kg): Σ reps × weight for that muscle group. */
  values: number[];
  totalVolume: number;
}

/** Radar axis order: canonical muscle groups, then any extras from data. */
export function muscleGroupRadarLabels(buckets: MuscleGroupBucket[]): string[] {
  const seen = new Set(buckets.map((b) => b.muscleGroup));
  const extras = [...seen]
    .filter((m) => !MUSCLE_GROUPS.includes(m as (typeof MUSCLE_GROUPS)[number]))
    .sort((a, b) => a.localeCompare(b));
  return [...MUSCLE_GROUPS, ...extras];
}

export function buildMuscleGroupRadarSeries(
  labels: readonly string[],
  buckets: MuscleGroupBucket[],
): MuscleGroupRadarSeries {
  const volumeByGroup = new Map(buckets.map((b) => [b.muscleGroup, b.volume]));
  const values = labels.map((mg) => volumeByGroup.get(mg) ?? 0);
  const totalVolume = values.reduce((sum, n) => sum + n, 0);
  return { labels: [...labels], values, totalVolume };
}

/** Format kg for radar tooltips and optional axis ticks. */
export function formatMuscleRadarVolumeKg(kg: number): string {
  if (!Number.isFinite(kg) || kg === 0) return '0 kg';
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`;
  const rounded = Math.round(kg * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded} kg` : `${rounded.toFixed(1)} kg`;
}

/** Suggested max for the radial scale (headroom above peak volume). */
export function muscleGroupRadarSuggestedMax(values: readonly number[]): number {
  const peak = values.reduce((max, v) => Math.max(max, v), 0);
  if (peak <= 0) return 1;
  return Math.ceil(peak * 1.1);
}
