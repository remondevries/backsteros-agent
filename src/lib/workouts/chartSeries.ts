import { addMonthsIso, formatDayShort, formatMonthShort, todayIso } from '../dateFormat';
import type { DateRange, Period } from '../periodTypes';
import type { VolumeChartGranularity } from './filter';
import type { WeekBucket } from './rollups';

export interface MuscleVolumeLineSeries {
  granularity: VolumeChartGranularity;
  labels: string[];
  /** Bucket id per label (`YYYY-MM-DD`, ISO week Monday, or `YYYY-MM`). */
  keys: string[];
  /** One value array per muscle group, aligned with `keys`. */
  byMuscle: Map<string, (number | null)[]>;
  /** Optional true counts when `byMuscle` is forward-filled for display (day progression). */
  rawByMuscle?: Map<string, number[]>;
}

function monthIsAfterToday(monthKey: string, today: string): boolean {
  return monthKey > today.slice(0, 7);
}

function calendarYearBucketRange(range: DateRange): DateRange {
  const year = range.start.slice(0, 4);
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

/** Jan–Dec axis with lines ending after the current month (YTD + full-year). */
function isWorkoutsFullYearMonthlyChartAxis(
  period: Period | undefined,
  granularity: VolumeChartGranularity,
  range: DateRange,
): boolean {
  if (granularity !== 'month' || !period) return false;
  if (period.kind === 'full-year') return true;
  if (period.kind === 'ytd') {
    const year = range.start.slice(0, 4);
    return range.start === `${year}-01-01`;
  }
  return false;
}

function monthKeysBetween(range: DateRange): string[] {
  const out: string[] = [];
  let cur = range.start.slice(0, 7);
  const end = range.end.slice(0, 7);
  while (cur <= end) {
    out.push(cur);
    cur = addMonthsIso(`${cur}-01`, 1).slice(0, 7);
  }
  return out;
}

function bucketVolumeForMuscle(bucket: WeekBucket, muscleGroup: string): number {
  return bucket.byMuscle.get(muscleGroup) ?? 0;
}

/**
 * Chart.js line series: one line per muscle group across volume buckets.
 * `buckets[].weekStart` is the bucket key for day, week, or month granularity.
 */
export function buildMuscleVolumeLineSeries(
  buckets: WeekBucket[],
  muscleGroups: string[],
  granularity: VolumeChartGranularity,
  range: DateRange,
  period?: Period,
  today: string = todayIso(),
): MuscleVolumeLineSeries {
  const bucketByKey = new Map(buckets.map((b) => [b.weekStart, b]));
  const fullYearAxis = isWorkoutsFullYearMonthlyChartAxis(period, granularity, range);

  if (granularity === 'month') {
    const axisRange = fullYearAxis ? calendarYearBucketRange(range) : range;
    const keys = monthKeysBetween(axisRange);
    const labels = keys.map((k) => formatMonthShort(k).slice(0, 3));
    const byMuscle = new Map<string, (number | null)[]>();

    for (const mg of muscleGroups) {
      byMuscle.set(
        mg,
        keys.map((monthKey) => {
          if (fullYearAxis && monthIsAfterToday(monthKey, today)) return null;
          const bucket = bucketByKey.get(monthKey);
          return bucket ? bucketVolumeForMuscle(bucket, mg) : 0;
        }),
      );
    }

    return { granularity, labels, keys, byMuscle };
  }

  const keys = buckets.map((b) => b.weekStart);
  const labels =
    granularity === 'day'
      ? keys.map((k) => formatDayShort(k))
      : keys.map((k) => {
          const [y, m, d] = k.split('-').map(Number);
          if (!y || !m || !d) return k;
          const monday = new Date(Date.UTC(y, m - 1, d));
          return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'short',
            timeZone: 'UTC',
          }).format(monday);
        });

  const byMuscle = new Map<string, (number | null)[]>();
  for (const mg of muscleGroups) {
    byMuscle.set(
      mg,
      keys.map((key) => {
        const bucket = bucketByKey.get(key);
        return bucket ? bucketVolumeForMuscle(bucket, mg) : 0;
      }),
    );
  }

  return { granularity, labels, keys, byMuscle };
}
