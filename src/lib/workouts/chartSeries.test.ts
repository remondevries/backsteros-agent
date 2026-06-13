import { describe, expect, test } from 'bun:test';
import { buildMuscleVolumeLineSeries } from './chartSeries';
import type { WeekBucket } from './rollups';

describe('buildMuscleVolumeLineSeries', () => {
  test('builds monthly lines for each muscle group on a full-year axis', () => {
    const buckets: WeekBucket[] = [
      {
        weekStart: '2026-01',
        byMuscle: new Map([
          ['Chest', 1000],
          ['Back', 500],
        ]),
        totalVolume: 1500,
      },
      {
        weekStart: '2026-05',
        byMuscle: new Map([['Chest', 2000]]),
        totalVolume: 2000,
      },
    ];

    const series = buildMuscleVolumeLineSeries(
      buckets,
      ['Chest', 'Back'],
      'month',
      { start: '2026-01-01', end: '2026-12-31' },
      { kind: 'full-year' },
      '2026-06-03',
    );

    expect(series.labels).toHaveLength(12);
    expect(series.labels[0]).toBe('Jan');
    expect(series.labels[11]).toBe('Dec');
    expect(series.byMuscle.get('Chest')?.[0]).toBe(1000);
    expect(series.byMuscle.get('Chest')?.[4]).toBe(2000);
    expect(series.byMuscle.get('Back')?.[0]).toBe(500);
    expect(series.byMuscle.get('Chest')?.[6]).toBeNull();
    expect(series.byMuscle.get('Back')?.[6]).toBeNull();
  });
});
