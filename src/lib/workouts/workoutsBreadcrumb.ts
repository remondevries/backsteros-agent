import { parseWorkoutDateKey, workoutDateKeyFromPath } from './workoutDays';

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

/** Breadcrumb/tab label for a vault workout session path; falls back to `title` for non-session paths. */
export function formatVaultWorkoutDocumentLabel(path: string, title: string): string {
  const dateKey = workoutDateKeyFromPath(path);
  if (dateKey) return formatWorkoutDayLabel(dateKey);
  return title;
}
