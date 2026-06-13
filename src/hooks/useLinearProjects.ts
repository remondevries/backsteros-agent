import { useCallback, useEffect, useState } from "react";
import { fetchAllLinearProjects, type LinearProjectSummary } from "../lib/api";

export function useLinearProjects(enabled: boolean) {
  const [projects, setProjects] = useState<LinearProjectSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setProjects([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchAllLinearProjects();
      setProjects(result.projects);
    } catch (err) {
      setProjects([]);
      setError(err instanceof Error ? err.message : "Failed to load Linear projects");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { projects, loading, error, refresh };
}
