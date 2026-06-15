import { useCallback, useEffect, useState } from "react";
import { fetchLinearWorkoutSubIssueCount } from "../lib/api";

export function useDailyGymSubIssueCount({
  teamId,
  date,
  enabled,
}: {
  teamId: string;
  date: string;
  enabled: boolean;
}) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const normalizedTeamId = teamId.trim();
    const normalizedDate = date.trim();
    if (!enabled || !normalizedTeamId || !normalizedDate) {
      setCount(0);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchLinearWorkoutSubIssueCount(normalizedTeamId, normalizedDate);
      if (result.error) {
        setError(result.error);
        setCount(0);
      } else {
        setCount(result.count);
      }
    } catch (err) {
      setCount(0);
      setError(err instanceof Error ? err.message : "Failed to load gym progress");
    } finally {
      setLoading(false);
    }
  }, [date, enabled, teamId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { count, loading, error, refresh };
}
