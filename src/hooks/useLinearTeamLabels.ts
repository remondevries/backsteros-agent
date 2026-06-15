import { useCallback, useEffect, useState } from "react";
import { fetchLinearTeamLabels } from "../lib/api";

export function useLinearTeamLabels(teamId: string | null | undefined, enabled = true) {
  const [labels, setLabels] = useState<{ id: string; name: string; color: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedTeamId = teamId?.trim() || null;

  const refresh = useCallback(async () => {
    if (!enabled || !normalizedTeamId) {
      setLabels([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchLinearTeamLabels(normalizedTeamId);
      if (result.error) {
        setLabels([]);
        setError(result.error);
      } else {
        setLabels(result.labels ?? []);
        setError(null);
      }
    } catch (loadError) {
      setLabels([]);
      setError(loadError instanceof Error ? loadError.message : "Failed to load team labels.");
    } finally {
      setLoading(false);
    }
  }, [enabled, normalizedTeamId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { labels, loading, error, refresh };
}
