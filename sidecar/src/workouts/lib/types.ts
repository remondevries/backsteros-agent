/** Shared types for the Workouts feature. */

export interface ExerciseCatalogEntry {
  name: string;
  muscleGroup: string;
  /** Short names and natural-language phrases for sentence matching. */
  aliases: string[];
}

/** A single working set, parsed from one row of `Workouts/YYYY-MM-DD.csv`. */
export interface WorkoutSet {
  /** ISO YYYY-MM-DD. */
  date: string;
  exercise: string;
  muscleGroup: string;
  /** 1-based ordinal of this set within the (date, exercise) group. */
  setNumber: number;
  reps: number;
  /** Numeric load in kg. 0 when bodyweight or empty in CSV. */
  weight: number;
  /** Free-text qualifier: "plus bar", "each arm", "body weight", etc. */
  detail: string;
  /** True when CSV had no weight (pure bodyweight set). */
  isBodyweight: boolean;
  /** ISO 8601 with local offset when logged via the session UI; omitted for legacy rows. */
  loggedAt?: string;
}

/** A workout session = all sets that share a date. */
export interface WorkoutSession {
  date: string;
  exercises: WorkoutSessionExercise[];
  totalSets: number;
  /** Sum of reps × weight across all sets with weight > 0. */
  totalVolume: number;
  /** Top set description, e.g. "Bench 40×7". */
  topLift: string;
}

export interface WorkoutSessionExercise {
  exercise: string;
  muscleGroup: string;
  sets: WorkoutSet[];
  /** Heaviest weight × max reps at that weight. */
  topSetWeight: number;
  topSetReps: number;
  /** Sum of reps × weight; 0 when bodyweight. */
  volume: number;
}

/** All-time personal best for one exercise (`Workouts/personal-records.csv`). */
export interface PersonalRecord {
  exercise: string;
  /** Heaviest load in kg; 0 when only bodyweight reps are tracked. */
  maxWeight: number;
  /** Reps at {@link maxWeight}. */
  reps: number;
  /** Date the weight PR was achieved (`YYYY-MM-DD`). */
  date: string;
  /** Absolute max reps in any set (bodyweight or weighted). */
  bestReps: number;
  /** Date the best-reps PR was achieved. */
  bestRepsDate: string;
}
