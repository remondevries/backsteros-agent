import { useCallback, useEffect, useState } from "react";
import { notifyWorkoutSessionChanged } from "../lib/workoutSessionEvents";
import {
  createLinearWorkoutMilestone,
  fetchLinearWorkoutMilestones,
  type WorkoutMilestoneEntity,
} from "../lib/api";

export function useLinearWorkoutMilestones({
  teamId,
  enabled,
}: {
  teamId: string;
  enabled: boolean;
}) {
  const [milestones, setMilestones] = useState<WorkoutMilestoneEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (options?: { background?: boolean }) => {
      const normalizedTeamId = teamId.trim();
      if (!enabled || !normalizedTeamId) {
        setMilestones([]);
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
        const result = await fetchLinearWorkoutMilestones(normalizedTeamId);
        if (result.error) {
          setError(result.error);
          setMilestones([]);
        } else {
          setMilestones(result.milestones);
        }
      } catch (err) {
        setMilestones([]);
        setError(err instanceof Error ? err.message : "Failed to load workout sessions");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [enabled, teamId],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const refreshInBackground = useCallback(() => refresh({ background: true }), [refresh]);

  const prependMilestone = useCallback((milestone: WorkoutMilestoneEntity) => {
    setMilestones((current) => {
      if (current.some((item) => item.id === milestone.id)) {
        return current;
      }
      return [milestone, ...current].sort((left, right) => {
        const leftDate = left.targetDate ?? "";
        const rightDate = right.targetDate ?? "";
        if (leftDate !== rightDate) return rightDate.localeCompare(leftDate);
        return left.name.localeCompare(right.name);
      });
    });
  }, []);

  const createMilestoneForDate = useCallback(
    async (date: string) => {
      const normalizedTeamId = teamId.trim();
      if (!enabled || !normalizedTeamId) {
        return { milestone: null as WorkoutMilestoneEntity | null, error: "Workouts team is not configured." };
      }

      const result = await createLinearWorkoutMilestone(normalizedTeamId, date);
      if (result.error || !result.milestone) {
        return {
          milestone: null as WorkoutMilestoneEntity | null,
          error: result.error ?? "Failed to create workout session.",
        };
      }

      prependMilestone(result.milestone);
      notifyWorkoutSessionChanged();
      return { milestone: result.milestone, error: null as string | null };
    },
    [enabled, prependMilestone, teamId],
  );

  return {
    milestones,
    loading,
    refreshing,
    error,
    refresh,
    refreshInBackground,
    prependMilestone,
    createMilestoneForDate,
  };
}
