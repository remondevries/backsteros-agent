import { useCallback, useEffect, useState } from "react";
import { fetchLinearTeams, type LinearTeamSummary } from "../lib/api";

export function useLinearTeams(enabled: boolean) {
  const [teams, setTeams] = useState<LinearTeamSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setTeams([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchLinearTeams();
      setTeams(result.teams);
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setTeams([]);
      setError(err instanceof Error ? err.message : "Failed to load Linear teams");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { teams, loading, error, refresh };
}
