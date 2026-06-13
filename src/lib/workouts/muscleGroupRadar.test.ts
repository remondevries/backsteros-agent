import { describe, expect, test } from 'bun:test';
import {
  buildMuscleGroupRadarSeries,
  formatMuscleRadarVolumeKg,
  muscleGroupRadarLabels,
  muscleGroupRadarSuggestedMax,
} from './muscleGroupRadar';
import type { MuscleGroupBucket } from './rollups';

describe('muscleGroupRadar', () => {
  test('labels use canonical order then extras', () => {
    const buckets: MuscleGroupBucket[] = [
      { muscleGroup: 'Unknown', sets: 1, volume: 0 },
      { muscleGroup: 'Chest', sets: 3, volume: 900 },
    ];
    expect(muscleGroupRadarLabels(buckets)).toEqual([
      'Chest',
      'Back',
      'Shoulders',
      'Biceps',
      'Triceps',
      'Legs',
      'Core',
      'Unknown',
    ]);
  });

  test('buildMuscleGroupRadarSeries maps volume (kg) per label', () => {
    const labels = ['Chest', 'Legs'];
    const series = buildMuscleGroupRadarSeries(labels, [
      { muscleGroup: 'Chest', sets: 4, volume: 1200 },
      { muscleGroup: 'Legs', sets: 2, volume: 3000 },
    ]);
    expect(series.values).toEqual([1200, 3000]);
    expect(series.totalVolume).toBe(4200);
  });

  test('formatMuscleRadarVolumeKg', () => {
    expect(formatMuscleRadarVolumeKg(0)).toBe('0 kg');
    expect(formatMuscleRadarVolumeKg(450)).toBe('450 kg');
    expect(formatMuscleRadarVolumeKg(1500)).toBe('1.5k kg');
  });

  test('muscleGroupRadarSuggestedMax adds headroom', () => {
    expect(muscleGroupRadarSuggestedMax([0, 10_000, 3000])).toBe(11_000);
    expect(muscleGroupRadarSuggestedMax([0])).toBe(1);
  });
});
