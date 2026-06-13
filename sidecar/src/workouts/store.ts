import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { indexOfHeaders, parseCsv } from "../csv/csvParse.ts";
import { serializeCsv } from "../csv/csvSerialize.ts";
import { catalogEntriesFromMarkdown } from "./exerciseCatalogMarkdown.ts";
import { DEFAULT_EXERCISE_CATALOG_ENTRIES } from "./exerciseCatalogDefault.ts";
import { setExerciseCatalogEntries } from "./exerciseCatalogRuntime.ts";
import { muscleGroupForExercise } from "./exerciseCatalog.ts";
import {
  EXERCISE_CATALOG_PATH,
  WORKOUTS_COLUMNS,
  WORKOUTS_FOLDER,
} from "./paths.ts";
import {
  nextSetNumber,
  rowFromWorkoutSet,
  sortWorkoutSets,
  workoutSetFromRow,
} from "./setsCsv.ts";
import {
  groupWorkoutSetsByDate,
  listAllWorkoutDateKeysFromFileNames,
  parseWorkoutDateKey,
  workoutsDayPath,
  WORKOUTS_DATE_KEY,
} from "./workoutDays.ts";
import type { ExerciseCatalogEntry, WorkoutSet } from "./types.ts";

export type WorkoutSetLocator = {
  date: string;
  exercise: string;
  setNumber: number;
};

function resolveWorkspacePath(notesPath: string, relativePath: string): string {
  const abs = join(notesPath, relativePath);
  const normalized = abs.replace(/\\/g, "/");
  const base = notesPath.replace(/\\/g, "/");
  if (!normalized.startsWith(base)) {
    throw new Error("Path must stay inside the notes workspace");
  }
  return abs;
}

function ensureWorkoutsFolder(notesPath: string): void {
  const abs = join(notesPath, WORKOUTS_FOLDER);
  if (!existsSync(abs)) {
    mkdirSync(abs, { recursive: true });
  }
}

function listWorkoutFileNames(notesPath: string): string[] {
  ensureWorkoutsFolder(notesPath);
  const abs = join(notesPath, WORKOUTS_FOLDER);
  if (!existsSync(abs) || !statSync(abs).isDirectory()) return [];
  return readdirSync(abs).filter((name) => !name.startsWith("."));
}

function readDayCsv(notesPath: string, dateKey: string): { rows: WorkoutSet[]; parseError: string | null } {
  if (!WORKOUTS_DATE_KEY.test(dateKey)) {
    throw new Error("Invalid workout date");
  }
  const path = workoutsDayPath(dateKey);
  const abs = resolveWorkspacePath(notesPath, path);
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    return { rows: [], parseError: null };
  }
  const text = readFileSync(abs, "utf8");
  try {
    const parsed = parseCsv(text);
    const idx = indexOfHeaders(parsed.headers);
    const rows: WorkoutSet[] = [];
    for (const row of parsed.rows) {
      const set = workoutSetFromRow(idx, row);
      if (set) rows.push(set);
    }
    return { rows: sortWorkoutSets(rows), parseError: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { rows: [], parseError: message };
  }
}

function writeDayCsv(notesPath: string, dateKey: string, rows: WorkoutSet[]): void {
  const sorted = sortWorkoutSets(rows);
  const path = workoutsDayPath(dateKey);
  const abs = resolveWorkspacePath(notesPath, path);
  if (sorted.length === 0) {
    if (existsSync(abs)) unlinkSync(abs);
    return;
  }
  ensureWorkoutsFolder(notesPath);
  const text = serializeCsv([...WORKOUTS_COLUMNS], sorted.map(rowFromWorkoutSet));
  writeFileSync(abs, text, "utf8");
}

function filterByDateRange(rows: WorkoutSet[], from?: string, to?: string): WorkoutSet[] {
  return rows.filter((row) => {
    if (from && row.date < from) return false;
    if (to && row.date > to) return false;
    return true;
  });
}

export function loadExerciseCatalog(notesPath: string): {
  entries: ExerciseCatalogEntry[];
  markdown: string;
} {
  ensureWorkoutsFolder(notesPath);
  const abs = resolveWorkspacePath(notesPath, EXERCISE_CATALOG_PATH);
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    setExerciseCatalogEntries([...DEFAULT_EXERCISE_CATALOG_ENTRIES]);
    return { entries: [...DEFAULT_EXERCISE_CATALOG_ENTRIES], markdown: "" };
  }
  const markdown = readFileSync(abs, "utf8");
  const parsed = catalogEntriesFromMarkdown(markdown);
  const entries = parsed.length > 0 ? parsed : [...DEFAULT_EXERCISE_CATALOG_ENTRIES];
  setExerciseCatalogEntries(entries);
  return { entries, markdown };
}

export function readAllWorkoutSets(
  notesPath: string,
  options?: { from?: string; to?: string },
): { sets: WorkoutSet[]; parseError: string | null; dateKeys: string[] } {
  loadExerciseCatalog(notesPath);
  const fileNames = listWorkoutFileNames(notesPath);
  const dateKeys = listAllWorkoutDateKeysFromFileNames(fileNames);
  const errors: string[] = [];
  const rows: WorkoutSet[] = [];
  for (const dateKey of dateKeys) {
    const snap = readDayCsv(notesPath, dateKey);
    if (snap.parseError) errors.push(`${workoutsDayPath(dateKey)}: ${snap.parseError}`);
    rows.push(...snap.rows);
  }
  const sets = filterByDateRange(sortWorkoutSets(rows), options?.from, options?.to);
  return {
    sets,
    parseError: errors.length > 0 ? errors.join("; ") : null,
    dateKeys,
  };
}

export function readWorkoutDaySets(
  notesPath: string,
  dateKey: string,
): { sets: WorkoutSet[]; parseError: string | null } {
  loadExerciseCatalog(notesPath);
  const snap = readDayCsv(notesPath, dateKey);
  return { sets: snap.rows, parseError: snap.parseError };
}

function readAllSetsMerged(notesPath: string): WorkoutSet[] {
  return readAllWorkoutSets(notesPath).sets;
}

function writeAllSets(notesPath: string, rows: WorkoutSet[]): void {
  const byDate = groupWorkoutSetsByDate(rows);
  const existingDateKeys = listAllWorkoutDateKeysFromFileNames(listWorkoutFileNames(notesPath));
  const allDateKeys = new Set([...existingDateKeys, ...byDate.keys()]);
  for (const dateKey of allDateKeys) {
    writeDayCsv(notesPath, dateKey, byDate.get(dateKey) ?? []);
  }
}

export function appendWorkoutSets(notesPath: string, incoming: WorkoutSet[]): number {
  if (incoming.length === 0) return 0;
  loadExerciseCatalog(notesPath);
  const merged = sortWorkoutSets([...readAllSetsMerged(notesPath), ...incoming]);
  writeAllSets(notesPath, merged);
  return incoming.length;
}

export function updateWorkoutSet(
  notesPath: string,
  locator: WorkoutSetLocator,
  patch: Pick<WorkoutSet, "weight" | "reps" | "isBodyweight">,
): boolean {
  loadExerciseCatalog(notesPath);
  const rows = readAllSetsMerged(notesPath);
  let found = false;
  const next = rows.map((row) => {
    if (
      row.date === locator.date &&
      row.exercise === locator.exercise &&
      row.setNumber === locator.setNumber
    ) {
      found = true;
      return {
        ...row,
        reps: patch.reps,
        weight: patch.weight,
        isBodyweight: patch.isBodyweight,
      };
    }
    return row;
  });
  if (!found) return false;
  writeAllSets(notesPath, next);
  return true;
}

export function deleteWorkoutSet(notesPath: string, locator: WorkoutSetLocator): boolean {
  loadExerciseCatalog(notesPath);
  const rows = readAllSetsMerged(notesPath);
  const next = rows.filter(
    (row) =>
      !(
        row.date === locator.date &&
        row.exercise === locator.exercise &&
        row.setNumber === locator.setNumber
      ),
  );
  if (next.length === rows.length) return false;
  writeAllSets(notesPath, next);
  return true;
}

function loggedAtMs(loggedAt?: string): number | null {
  if (!loggedAt) return null;
  const t = Date.parse(loggedAt);
  return Number.isFinite(t) ? t : null;
}

function isRowInActiveSession(
  row: WorkoutSet,
  date: string,
  sessionStartMs: number | null | undefined,
): boolean {
  if (row.date !== date) return false;
  if (sessionStartMs == null) return true;
  const loggedMs = loggedAtMs(row.loggedAt);
  if (loggedMs == null) return false;
  return loggedMs >= sessionStartMs;
}

export function deleteWorkoutSession(
  notesPath: string,
  date: string,
  sessionStartMs?: number | null,
): boolean {
  loadExerciseCatalog(notesPath);
  const rows = readAllSetsMerged(notesPath);
  const rowsToDelete = rows.filter((row) => isRowInActiveSession(row, date, sessionStartMs));
  if (rowsToDelete.length === 0) return true;
  const next = rows.filter((row) => !isRowInActiveSession(row, date, sessionStartMs));
  writeAllSets(notesPath, next);
  return true;
}

export function deleteWorkoutExercise(
  notesPath: string,
  locator: Pick<WorkoutSetLocator, "date" | "exercise">,
): boolean {
  loadExerciseCatalog(notesPath);
  const rows = readAllSetsMerged(notesPath);
  const next = rows.filter(
    (row) => !(row.date === locator.date && row.exercise === locator.exercise),
  );
  if (next.length === rows.length) return false;
  writeAllSets(notesPath, next);
  return true;
}

export function renameWorkoutExercise(
  notesPath: string,
  locator: Pick<WorkoutSetLocator, "date" | "exercise">,
  newExercise: string,
): boolean {
  const trimmed = newExercise.trim();
  if (!trimmed) return false;
  loadExerciseCatalog(notesPath);
  const rows = readAllSetsMerged(notesPath);
  const muscleGroup = muscleGroupForExercise(trimmed);
  let found = false;
  const next = rows.map((row) => {
    if (row.date === locator.date && row.exercise === locator.exercise) {
      found = true;
      return { ...row, exercise: trimmed, muscleGroup };
    }
    return row;
  });
  if (!found) return false;
  writeAllSets(notesPath, next);
  return true;
}

export function prepareAppendSets(
  notesPath: string,
  incoming: Omit<WorkoutSet, "setNumber" | "muscleGroup">[],
): WorkoutSet[] {
  loadExerciseCatalog(notesPath);
  const existing = readAllSetsMerged(notesPath);
  return incoming.map((set) => ({
    ...set,
    muscleGroup: muscleGroupForExercise(set.exercise) || set.muscleGroup || "",
    setNumber: nextSetNumber(existing, set.date, set.exercise),
  }));
}

export function assertWorkoutDateKey(dateKey: string): string {
  if (!parseWorkoutDateKey(dateKey)) {
    throw new Error("Invalid workout date");
  }
  return dateKey;
}
