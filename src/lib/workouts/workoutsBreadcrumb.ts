import { parseWorkoutDateKey } from './workoutDays';

/** Human-readable day label for sidebar and breadcrumbs (e.g. "May 24"). */
export function formatWorkoutDayLabel(dateKey: string): string {
  const parsed = parseWorkoutDateKey(dateKey);
  if (!parsed) return dateKey;
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)));
  } catch {
    return dateKey;
  }
}
