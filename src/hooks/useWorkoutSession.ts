import { useCallback, useEffect, useState } from "react";
import {
  appendLinearWorkoutRep,
  createLinearWorkoutGroupSet,
  deleteLinearIssue,
  fetchLinearWorkoutSession,
  updateLinearIssueDetail,
  type WorkoutGroupSetEntity,
  type WorkoutRepEntity,
  type WorkoutSessionEntity,
} from "../lib/api";
import { notifyWorkoutSessionChanged } from "../lib/workoutSessionEvents";

export function useWorkoutSession({
  teamId,
  dateKey,
  enabled,
}: {
  teamId: string | null | undefined;
  dateKey: string | null | undefined;
  enabled: boolean;
}) {
  const [session, setSession] = useState<WorkoutSessionEntity | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [addingRepToGroupSetId, setAddingRepToGroupSetId] = useState<string | null>(null);
  const [deletingIssueId, setDeletingIssueId] = useState<string | null>(null);
  const [updatingIssueId, setUpdatingIssueId] = useState<string | null>(null);

  const normalizedTeamId = teamId?.trim() || null;
  const normalizedDateKey = dateKey?.trim() || null;

  const refresh = useCallback(
    async (options?: { background?: boolean }) => {
      if (!enabled || !normalizedTeamId || !normalizedDateKey) {
        setSession(null);
        setError(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const isBackgroundRefresh = options?.background ?? false;
      if (isBackgroundRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const result = await fetchLinearWorkoutSession(normalizedTeamId, normalizedDateKey);
        if (result.error) {
          setSession(null);
          setError(result.error);
        } else {
          setSession(result.session);
        }
      } catch (err) {
        setSession(null);
        setError(err instanceof Error ? err.message : "Failed to load workout session");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [enabled, normalizedDateKey, normalizedTeamId],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const refreshInBackground = useCallback(() => refresh({ background: true }), [refresh]);

  const createGroupSet = useCallback(
    async (exercise: string) => {
      if (!normalizedTeamId || !normalizedDateKey) {
        return { groupSet: null as WorkoutGroupSetEntity | null, error: "Workouts team is not configured." };
      }

      setSubmitting(true);
      setError(null);
      try {
        const result = await createLinearWorkoutGroupSet(normalizedTeamId, normalizedDateKey, exercise);
        if (result.error || !result.groupSet) {
          const message = result.error ?? "Failed to create group set.";
          setError(message);
          return { groupSet: null as WorkoutGroupSetEntity | null, error: message };
        }

        setSession((current) => {
          if (!current) return current;
          const existing = current.groupSets.some((entry) => entry.id === result.groupSet!.id);
          if (existing) return current;
          return {
            ...current,
            groupSets: [result.groupSet!, ...current.groupSets],
          };
        });
        notifyWorkoutSessionChanged();
        return { groupSet: result.groupSet, error: null as string | null };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create group set.";
        setError(message);
        return { groupSet: null as WorkoutGroupSetEntity | null, error: message };
      } finally {
        setSubmitting(false);
      }
    },
    [normalizedDateKey, normalizedTeamId],
  );

  const logRep = useCallback(
    async (input: {
      exercise: string;
      groupSetId?: string | null;
    }) => {
      if (!normalizedTeamId || !normalizedDateKey) {
        return {
          groupSet: null as WorkoutGroupSetEntity | null,
          rep: null as WorkoutRepEntity | null,
          error: "Workouts team is not configured.",
        };
      }

      setSubmitting(true);
      setError(null);
      try {
        const result = await appendLinearWorkoutRep(normalizedTeamId, normalizedDateKey, input);
        if (result.error || !result.groupSet || !result.rep) {
          const message = result.error ?? "Failed to log rep.";
          setError(message);
          return {
            groupSet: null as WorkoutGroupSetEntity | null,
            rep: null as WorkoutRepEntity | null,
            error: message,
          };
        }

        setSession((current) => {
          if (!current) return current;
          return {
            ...current,
            groupSets: current.groupSets.map((groupSet) =>
              groupSet.id === result.groupSet!.id ? result.groupSet! : groupSet,
            ),
          };
        });

        notifyWorkoutSessionChanged();
        return { groupSet: result.groupSet, rep: result.rep, error: null as string | null };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to log rep.";
        setError(message);
        return {
          groupSet: null as WorkoutGroupSetEntity | null,
          rep: null as WorkoutRepEntity | null,
          error: message,
        };
      } finally {
        setSubmitting(false);
      }
    },
    [normalizedDateKey, normalizedTeamId],
  );

  const addRepToGroupSet = useCallback(
    async (groupSet: WorkoutGroupSetEntity) => {
      if (!normalizedTeamId || !normalizedDateKey) {
        return {
          groupSet: null as WorkoutGroupSetEntity | null,
          rep: null as WorkoutRepEntity | null,
          error: "Workouts team is not configured.",
        };
      }

      const exercise = groupSet.exercise?.trim() || groupSet.title.trim();
      if (!exercise) {
        return {
          groupSet: null as WorkoutGroupSetEntity | null,
          rep: null as WorkoutRepEntity | null,
          error: "Exercise is required before adding a set.",
        };
      }

      setAddingRepToGroupSetId(groupSet.id);
      setError(null);
      try {
        const result = await appendLinearWorkoutRep(normalizedTeamId, normalizedDateKey, {
          groupSetId: groupSet.id,
          exercise,
          blankWeight: true,
        });
        if (result.error || !result.groupSet || !result.rep) {
          const message = result.error ?? "Failed to add set.";
          setError(message);
          return {
            groupSet: null as WorkoutGroupSetEntity | null,
            rep: null as WorkoutRepEntity | null,
            error: message,
          };
        }

        setSession((current) => {
          if (!current) return current;
          return {
            ...current,
            groupSets: current.groupSets.map((entry) =>
              entry.id === result.groupSet!.id ? result.groupSet! : entry,
            ),
          };
        });

        notifyWorkoutSessionChanged();
        return { groupSet: result.groupSet, rep: result.rep, error: null as string | null };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add set.";
        setError(message);
        return {
          groupSet: null as WorkoutGroupSetEntity | null,
          rep: null as WorkoutRepEntity | null,
          error: message,
        };
      } finally {
        setAddingRepToGroupSetId(null);
      }
    },
    [normalizedDateKey, normalizedTeamId],
  );

  const removeIssueFromSession = useCallback((issueId: string) => {
    setSession((current) => {
      if (!current) return current;
      return {
        ...current,
        groupSets: current.groupSets
          .map((groupSet) => ({
            ...groupSet,
            reps: groupSet.reps.filter((rep) => rep.id !== issueId),
          }))
          .filter((groupSet) => groupSet.id !== issueId),
      };
    });
  }, []);

  const deleteRep = useCallback(
    async (repId: string) => {
      setDeletingIssueId(repId);
      setError(null);
      try {
        const result = await deleteLinearIssue(repId);
        if (result.error || !result.success) {
          const message = result.error ?? "Failed to delete rep.";
          setError(message);
          return { success: false as const, error: message };
        }
        removeIssueFromSession(repId);
        notifyWorkoutSessionChanged();
        return { success: true as const, error: null as string | null };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete rep.";
        setError(message);
        return { success: false as const, error: message };
      } finally {
        setDeletingIssueId(null);
      }
    },
    [removeIssueFromSession],
  );

  const deleteGroupSet = useCallback(
    async (groupSet: WorkoutGroupSetEntity) => {
      setDeletingIssueId(groupSet.id);
      setError(null);
      try {
        const result = await deleteLinearIssue(groupSet.id);
        if (result.error || !result.success) {
          throw new Error(result.error ?? "Failed to delete group set.");
        }
        removeIssueFromSession(groupSet.id);
        notifyWorkoutSessionChanged();
        return { success: true as const, error: null as string | null };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete group set.";
        setError(message);
        void refresh({ background: true });
        return { success: false as const, error: message };
      } finally {
        setDeletingIssueId(null);
      }
    },
    [refresh, removeIssueFromSession],
  );

  const updateGroupSetExercise = useCallback(
    async (groupSetId: string, exercise: string, labelId?: string | null) => {
      const normalizedExercise = exercise.trim();
      if (!normalizedExercise) {
        return { success: false as const, error: "Exercise is required." };
      }

      setUpdatingIssueId(groupSetId);
      setError(null);
      try {
        const updates: { title: string; labelIds?: string[] } = { title: normalizedExercise };
        if (labelId) {
          updates.labelIds = [labelId];
        }
        const result = await updateLinearIssueDetail(groupSetId, updates);
        if (result.error || !result.issue) {
          const message = result.error ?? "Failed to update exercise.";
          setError(message);
          return { success: false as const, error: message };
        }

        setSession((current) => {
          if (!current) return current;
          return {
            ...current,
            groupSets: current.groupSets.map((groupSet) =>
              groupSet.id === groupSetId
                ? {
                    ...groupSet,
                    title: result.issue!.title,
                    exercise: result.issue!.title,
                  }
                : groupSet,
            ),
          };
        });

        notifyWorkoutSessionChanged();
        return { success: true as const, error: null as string | null };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update exercise.";
        setError(message);
        return { success: false as const, error: message };
      } finally {
        setUpdatingIssueId(null);
      }
    },
    [],
  );

  const updateRepCount = useCallback(
    async (repId: string, count: number) => {
      if (!Number.isFinite(count) || count <= 0) {
        return { success: false as const, error: "Enter a valid rep count." };
      }

      setUpdatingIssueId(repId);
      setError(null);
      try {
        const result = await updateLinearIssueDetail(repId, {
          description: String(count),
          labelIds: [],
        });
        if (result.error || !result.issue) {
          const message = result.error ?? "Failed to update reps.";
          setError(message);
          return { success: false as const, error: message };
        }

        setSession((current) => {
          if (!current) return current;
          return {
            ...current,
            groupSets: current.groupSets.map((groupSet) => ({
              ...groupSet,
              reps: groupSet.reps.map((rep) =>
                rep.id === repId
                  ? {
                      ...rep,
                      description: String(count),
                      labels: [],
                      reps: count,
                    }
                  : rep,
              ),
            })),
          };
        });

        notifyWorkoutSessionChanged();
        return { success: true as const, error: null as string | null };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update reps.";
        setError(message);
        return { success: false as const, error: message };
      } finally {
        setUpdatingIssueId(null);
      }
    },
    [],
  );

  const updateRepWeight = useCallback(
    async (repId: string, weight: string) => {
      const normalizedWeight = weight.trim();
      if (!normalizedWeight) {
        return { success: false as const, error: "Weight is required." };
      }

      setUpdatingIssueId(repId);
      setError(null);
      try {
        const result = await updateLinearIssueDetail(repId, { title: normalizedWeight });
        if (result.error || !result.issue) {
          const message = result.error ?? "Failed to update weight.";
          setError(message);
          return { success: false as const, error: message };
        }

        setSession((current) => {
          if (!current) return current;
          return {
            ...current,
            groupSets: current.groupSets.map((groupSet) => ({
              ...groupSet,
              reps: groupSet.reps.map((rep) =>
                rep.id === repId
                  ? {
                      ...rep,
                      title: result.issue!.title,
                    }
                  : rep,
              ),
            })),
          };
        });

        notifyWorkoutSessionChanged();
        return { success: true as const, error: null as string | null };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update weight.";
        setError(message);
        return { success: false as const, error: message };
      } finally {
        setUpdatingIssueId(null);
      }
    },
    [],
  );

  return {
    session,
    groupSets: session?.groupSets ?? [],
    loading,
    refreshing,
    error,
    submitting,
    addingRepToGroupSetId,
    deletingIssueId,
    updatingIssueId,
    refresh,
    refreshInBackground,
    createGroupSet,
    logRep,
    addRepToGroupSet,
    deleteRep,
    deleteGroupSet,
    updateGroupSetExercise,
    updateRepCount,
    updateRepWeight,
  };
}
