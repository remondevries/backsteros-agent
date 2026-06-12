import { useCallback, useEffect, useState } from "react";
import { fetchLinearProjectOverview, type LinearProjectOverview } from "../lib/api";

export function useLinearProjectOverview(projectId: string | null, enabled: boolean) {
  const [overview, setOverview] = useState<LinearProjectOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !projectId) {
      setOverview(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchLinearProjectOverview(projectId);
      setOverview(result.overview);
      if (result.error) {
        setError(result.error);
      } else if (!result.overview) {
        setError("Project not found.");
      }
    } catch (err) {
      setOverview(null);
      setError(err instanceof Error ? err.message : "Failed to load project overview");
    } finally {
      setLoading(false);
    }
  }, [enabled, projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { overview, loading, error, refresh };
}
