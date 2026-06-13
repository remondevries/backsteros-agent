/** Single source of truth for all paths under the Workouts folder. */

export const WORKOUTS_FOLDER = 'Workouts';
export const WORKOUTS_DASHBOARD_PATH = `${WORKOUTS_FOLDER}/Dashboard.md`;
export const EXERCISE_CATALOG_PATH = `${WORKOUTS_FOLDER}/exercise-catalog.md`;
export const PERSONAL_RECORDS_PATH = `${WORKOUTS_FOLDER}/personal-records.csv`;

/** Files under `Workouts/` that use the inbox-daily shell with left sidepanel (dashboard, CSVs, notes). */
export function isWorkoutsTreeMarkdownPath(path: string): boolean {
  return path === WORKOUTS_DASHBOARD_PATH || path.startsWith(`${WORKOUTS_FOLDER}/`);
}

/** Stable column order written to / read from `Workouts/YYYY-MM-DD.csv`. */
export const WORKOUTS_COLUMNS = [
  'Date',
  'Exercise',
  'Muscle group',
  'Set number',
  'Reps',
  'Weight',
  'Detail',
  'Logged at',
] as const;

/** Stable column order for `Workouts/personal-records.csv`. */
export const PERSONAL_RECORDS_COLUMNS = [
  'Exercise',
  'Max weight',
  'Reps',
  'Date',
  'Best reps',
  'Best reps date',
] as const;
