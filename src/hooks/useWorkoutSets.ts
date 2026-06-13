import { useCallback, useEffect, useMemo, useState } from "react";
import {
  appendWorkoutSets,
  deleteWorkoutSet,
  fetchWorkoutCatalog,
  fetchWorkoutSets,
  updateWorkoutSet,
  type WorkoutSetWire,
} from "../lib/api";
import { setExerciseCatalogEntries } from "../lib/workouts/exerciseCatalogRuntime";
import { computePersonalRecordFromSets } from "../lib/workouts/personalRecords";
import type { PersonalRecord, WorkoutSet } from "../lib/workouts/types";

function toWorkoutSet(row: WorkoutSetWire): WorkoutSet {
  return {
    date: row.date,
    exercise: row.exercise,
    muscleGroup: row.muscleGroup ?? "",
    setNumber: row.setNumber ?? 1,
    reps: row.reps,
    weight: row.weight,
    detail: row.detail ?? "",
    isBodyweight: row.isBodyweight ?? row.weight <= 0,
    loggedAt: row.loggedAt,
  };
}

export function useWorkoutSets() {
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [dateKeys, setDateKeys] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [setsResult, catalogResult] = await Promise.all([
        fetchWorkoutSets(),
        fetchWorkoutCatalog(),
      ]);
      if (setsResult.error) {
        setError(setsResult.error);
        setSets([]);
        setDateKeys([]);
        setParseError(null);
        return;
      }
      if (catalogResult.entries) {
        setExerciseCatalogEntries(catalogResult.entries);
      }
      setSets(setsResult.sets.map(toWorkoutSet));
      setDateKeys(setsResult.dateKeys ?? []);
      setParseError(setsResult.parseError ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workouts");
      setSets([]);
      setDateKeys([]);
      setParseError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const personalRecords = useMemo(() => {
    const exercises = [...new Set(sets.map((set) => set.exercise))];
    const map = new Map<string, PersonalRecord>();
    for (const exercise of exercises) {
      const record = computePersonalRecordFromSets(exercise, sets);
      if (record) map.set(exercise, record);
    }
    return map;
  }, [sets]);

  const appendSets = useCallback(
    async (incoming: Omit<WorkoutSetWire, "setNumber">[]) => {
      const result = await appendWorkoutSets(incoming);
      if (result.error) throw new Error(result.error);
      await refresh();
      return result;
    },
    [refresh],
  );

  const patchSet = useCallback(
    async (
      locator: { date: string; exercise: string; setNumber: number },
      patch: { reps: number; weight: number; isBodyweight: boolean },
    ) => {
      const result = await updateWorkoutSet(locator, patch);
      if (result.error) throw new Error(result.error);
      await refresh();
      return result.ok;
    },
    [refresh],
  );

  const removeSet = useCallback(
    async (locator: { date: string; exercise: string; setNumber: number }) => {
      const result = await deleteWorkoutSet(locator);
      if (result.error) throw new Error(result.error);
      await refresh();
      return result.ok;
    },
    [refresh],
  );

  return {
    sets,
    dateKeys,
    parseError,
    loading,
    error,
    refresh,
    personalRecords,
    appendSets,
    patchSet,
    removeSet,
  };
}
