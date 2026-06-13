import { formatWeekRangeLabel, isoWeekKey } from '../dateFormat';
import { computeWorkoutsRollups } from './rollups';
import { formatWorkoutDayLabel } from './workoutsBreadcrumb';
import {
  groupWorkoutSetsByDate,
  parseWorkoutDateKey,
  workoutsDayPath,
} from './workoutDays';
import type { WorkoutSet } from './types';

export interface WorkoutsSidebarTotals {
  /** Σ (reps × weight) for working sets in scope. */
  volume: number;
  /** Distinct exercise names in scope. */
  exercises: number;
}

export interface WorkoutsSidebarDayNode extends WorkoutsSidebarTotals {
  dateKey: string;
  path: string;
  label: string;
  monthKey: string;
  weekKey: string;
  /** Used when rolling up week/month/year totals (not shown in UI). */
  exerciseNames: string[];
  /** Unfinished quick-entry session for this day. */
  inProgress?: boolean;
}

export interface WorkoutsSidebarWeekNode extends WorkoutsSidebarTotals {
  weekKey: string;
  label: string;
  days: WorkoutsSidebarDayNode[];
}

export interface WorkoutsSidebarMonthNode extends WorkoutsSidebarTotals {
  monthKey: string;
  label: string;
  weeks: WorkoutsSidebarWeekNode[];
}

export interface WorkoutsSidebarYearNode extends WorkoutsSidebarTotals {
  year: number;
  months: WorkoutsSidebarMonthNode[];
}

/** Human-readable month label for sidebar (e.g. "May"). */
function formatWorkoutMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(
      new Date(Date.UTC(y, m - 1, 1)),
    );
  } catch {
    return monthKey;
  }
}

/** Distinct exercises + total volume across one or more session days. */
export function mergeWorkoutsSidebarTotalsFromDays(
  days: Pick<WorkoutsSidebarDayNode, 'volume' | 'exerciseNames'>[],
): WorkoutsSidebarTotals {
  const names = new Set<string>();
  let volume = 0;
  for (const day of days) {
    volume += day.volume;
    for (const name of day.exerciseNames) names.add(name);
  }
  return { volume, exercises: names.size };
}

function buildWeekNodes(days: WorkoutsSidebarDayNode[]): WorkoutsSidebarWeekNode[] {
  const byWeek = new Map<string, WorkoutsSidebarDayNode[]>();
  for (const day of days) {
    if (!byWeek.has(day.weekKey)) byWeek.set(day.weekKey, []);
    byWeek.get(day.weekKey)!.push(day);
  }
  const out: WorkoutsSidebarWeekNode[] = [];
  for (const [weekKey, bucket] of byWeek.entries()) {
    bucket.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    out.push({
      weekKey,
      label: formatWeekRangeLabel(weekKey),
      days: bucket,
      ...mergeWorkoutsSidebarTotalsFromDays(bucket),
    });
  }
  return out.sort((a, b) => b.weekKey.localeCompare(a.weekKey));
}

function buildMonthNodes(days: WorkoutsSidebarDayNode[]): WorkoutsSidebarMonthNode[] {
  const byMonth = new Map<string, WorkoutsSidebarDayNode[]>();
  for (const day of days) {
    if (!byMonth.has(day.monthKey)) byMonth.set(day.monthKey, []);
    byMonth.get(day.monthKey)!.push(day);
  }
  const out: WorkoutsSidebarMonthNode[] = [];
  for (const [monthKey, bucket] of byMonth.entries()) {
    bucket.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    out.push({
      monthKey,
      label: formatWorkoutMonthLabel(monthKey),
      weeks: buildWeekNodes(bucket),
      ...mergeWorkoutsSidebarTotalsFromDays(bucket),
    });
  }
  return out.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

function buildYearNodes(days: WorkoutsSidebarDayNode[]): WorkoutsSidebarYearNode[] {
  const byYear = new Map<number, WorkoutsSidebarDayNode[]>();
  for (const day of days) {
    const year = Number.parseInt(day.dateKey.slice(0, 4), 10);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(day);
  }
  const out: WorkoutsSidebarYearNode[] = [];
  for (const [year, bucket] of byYear.entries()) {
    out.push({
      year,
      months: buildMonthNodes(bucket),
      ...mergeWorkoutsSidebarTotalsFromDays(bucket),
    });
  }
  return out.sort((a, b) => b.year - a.year);
}

function dayNodeFromSets(dateKey: string, sets: WorkoutSet[]): WorkoutsSidebarDayNode | null {
  const parsed = parseWorkoutDateKey(dateKey);
  if (!parsed) return null;
  const rollups = computeWorkoutsRollups(sets);
  return {
    dateKey,
    path: workoutsDayPath(dateKey),
    label: formatWorkoutDayLabel(dateKey),
    monthKey: dateKey.slice(0, 7),
    weekKey: isoWeekKey(dateKey),
    volume: rollups.kpis.totalVolume,
    exercises: rollups.exercises.length,
    exerciseNames: rollups.exercises,
  };
}

/** Build year → month → week → day tree from flat workout sets (API / in-memory data). */
export function buildWorkoutsSidebarTreeFromSets(sets: WorkoutSet[]): WorkoutsSidebarYearNode[] {
  const byDate = groupWorkoutSetsByDate(sets);
  const dayNodes: WorkoutsSidebarDayNode[] = [];
  for (const [dateKey, dateSets] of byDate.entries()) {
    const node = dayNodeFromSets(dateKey, dateSets);
    if (node) dayNodes.push(node);
  }
  if (dayNodes.length === 0) return [];
  return buildYearNodes(dayNodes);
}

function flattenWorkoutsSidebarDays(tree: WorkoutsSidebarYearNode[]): WorkoutsSidebarDayNode[] {
  const days: WorkoutsSidebarDayNode[] = [];
  for (const yearNode of tree) {
    for (const monthNode of yearNode.months) {
      for (const weekNode of monthNode.weeks) {
        days.push(...weekNode.days);
      }
    }
  }
  return days;
}

/**
 * Ensures an unfinished quick-entry session appears in the vault sidebar/history tree,
 * even before its day CSV exists or after minimize.
 */
export function mergeActiveWorkoutSessionIntoSidebarTree(
  tree: WorkoutsSidebarYearNode[],
  activeDateKey: string | null,
): WorkoutsSidebarYearNode[] {
  if (!activeDateKey) return tree;
  const parsed = parseWorkoutDateKey(activeDateKey);
  if (!parsed) return tree;

  const days = flattenWorkoutsSidebarDays(tree);
  const existingIdx = days.findIndex((day) => day.dateKey === activeDateKey);
  if (existingIdx >= 0) {
    days[existingIdx] = { ...days[existingIdx], inProgress: true };
  } else {
    days.push({
      dateKey: activeDateKey,
      path: workoutsDayPath(activeDateKey),
      label: formatWorkoutDayLabel(activeDateKey),
      monthKey: activeDateKey.slice(0, 7),
      weekKey: isoWeekKey(activeDateKey),
      volume: 0,
      exercises: 0,
      exerciseNames: [],
      inProgress: true,
    });
  }

  return buildYearNodes(days);
}

/** Most recent session day in the sidebar tree (by `YYYY-MM-DD` date key). */
export function latestWorkoutDayInSidebarTree(
  tree: WorkoutsSidebarYearNode[],
): WorkoutsSidebarDayNode | null {
  let latest: WorkoutsSidebarDayNode | null = null;
  for (const yearNode of tree) {
    for (const monthNode of yearNode.months) {
      for (const weekNode of monthNode.weeks) {
        for (const day of weekNode.days) {
          if (!latest || day.dateKey > latest.dateKey) latest = day;
        }
      }
    }
  }
  return latest;
}
