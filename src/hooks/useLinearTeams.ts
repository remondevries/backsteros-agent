import { useCallback, useEffect, useState } from "react";
import { fetchLinearTeams, type LinearTeamSummary } from "../lib/api";

export function useLinearTeams(enabled: boolean) {
  const [teams, setTeams] = useState<LinearTeamSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (options?: { background?: boolean }) => {
      if (!enabled) {
        setTeams([]);
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
        const result = await fetchLinearTeams({ force: isBackgroundRefresh });
        setTeams(result.teams);
        if (result.error) {
          setError(result.error);
        }
      } catch (err) {
        setTeams([]);
        setError(err instanceof Error ? err.message : "Failed to load Linear teams");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [enabled],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { teams, loading, refreshing, error, refresh };
}
