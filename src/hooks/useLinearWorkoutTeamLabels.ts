import { useCallback, useEffect, useState } from "react";
import { fetchLinearTeamLabels } from "../lib/api";
import type { LinearWorkoutSetLabel } from "../lib/workouts/linearWorkoutTypes";

export function useLinearWorkoutTeamLabels(
  teamId: string | null | undefined,
  group: string,
  enabled = true,
) {
  const [labels, setLabels] = useState<LinearWorkoutSetLabel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedTeamId = teamId?.trim() || null;
  const normalizedGroup = group.trim();

  const refresh = useCallback(async () => {
    if (!enabled || !normalizedTeamId || !normalizedGroup) {
      setLabels([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchLinearTeamLabels(normalizedTeamId, {
        group: normalizedGroup,
      });
      if (result.error) {
        setLabels([]);
        setError(result.error);
      } else {
        setLabels(result.labels ?? []);
        setError(null);
      }
    } catch (loadError) {
      setLabels([]);
      setError(loadError instanceof Error ? loadError.message : "Failed to load workout labels.");
    } finally {
      setLoading(false);
    }
  }, [enabled, normalizedGroup, normalizedTeamId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { labels, loading, error, refresh };
}
