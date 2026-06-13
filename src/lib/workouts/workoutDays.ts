import { WORKOUTS_FOLDER } from './paths';
import type { WorkoutSet } from './types';

/** Matches `2026-05-24` date keys. */
export const WORKOUTS_DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Matches `Workouts/2026-05-24.csv` file names. */
const WORKOUTS_DATE_CSV_NAME = /^(\d{4})-(\d{2})-(\d{2})\.csv$/;

const RESERVED_WORKOUTS_FILES = new Set(['dashboard.md', 'exercise-catalog.md', 'personal-records.csv']);

export function workoutsDayPath(dateKey: string): string {
  return `${WORKOUTS_FOLDER}/${dateKey}.csv`;
}

export function workoutsLegacyCsvPath(year: number): string {
  return `${WORKOUTS_FOLDER}/${year}/workouts.csv`;
}

export function parseWorkoutDateKey(dateKey: string): { year: number; month: number; day: number } | null {
  const m = WORKOUTS_DATE_KEY.exec(dateKey.trim());
  if (!m) return null;
  const year = Number.parseInt(m[1]!, 10);
  const month = Number.parseInt(m[2]!, 10);
  const day = Number.parseInt(m[3]!, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

export function workoutDateKeyFromPath(path: string): string | null {
  const base = path.slice(path.lastIndexOf('/') + 1);
  const m = WORKOUTS_DATE_CSV_NAME.exec(base);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function isWorkoutsDayCsvPathForYear(path: string, year: number): boolean {
  const dateKey = workoutDateKeyFromPath(path);
  if (!dateKey) return false;
  const parsed = parseWorkoutDateKey(dateKey);
  return parsed?.year === year;
}

/** Human-readable pattern for dashboard empty/error states. */
export function workoutsDayCsvPattern(year: number): string {
  return `${WORKOUTS_FOLDER}/${year}-MM-DD.csv`;
}

function dateKeyFromFileName(name: string): string | null {
  if (RESERVED_WORKOUTS_FILES.has(name.toLowerCase())) return null;
  const m = WORKOUTS_DATE_CSV_NAME.exec(name);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Session dates from daily CSV file names for a calendar year, sorted ascending. */
export function listWorkoutDateKeysFromFileNames(fileNames: string[], year: number): string[] {
  const out: string[] = [];
  for (const name of fileNames) {
    const dateKey = dateKeyFromFileName(name);
    if (!dateKey || !dateKey.startsWith(`${year}-`)) continue;
    out.push(dateKey);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

/** Every `YYYY-MM-DD.csv` date key from file names, sorted ascending. */
export function listAllWorkoutDateKeysFromFileNames(fileNames: string[]): string[] {
  const out: string[] = [];
  for (const name of fileNames) {
    const dateKey = dateKeyFromFileName(name);
    if (dateKey) out.push(dateKey);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

export function groupWorkoutSetsByDate(rows: WorkoutSet[]): Map<string, WorkoutSet[]> {
  const map = new Map<string, WorkoutSet[]>();
  for (const row of rows) {
    const key = row.date.trim();
    if (!WORKOUTS_DATE_KEY.test(key)) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return map;
}
