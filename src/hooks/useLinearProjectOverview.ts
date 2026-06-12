import { useCallback, useEffect, useState } from "react";
import {
  fetchLinearProjectOverview,
  updateLinearProjectOverviewDescription,
  type LinearProjectOverview,
} from "../lib/api";

export function useLinearProjectOverview(projectId: string | null, enabled: boolean) {
  const [overview, setOverview] = useState<LinearProjectOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (options?: { background?: boolean }) => {
      if (!enabled || !projectId) {
        setOverview(null);
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
        setRefreshing(false);
      }
    },
    [enabled, projectId],
  );

  const saveDescription = useCallback(
    async (content: string): Promise<string | null> => {
      if (!projectId) return "Project not found.";

      const result = await updateLinearProjectOverviewDescription(projectId, content);
      if (result.error) {
        return result.error;
      }
      if (!result.overview) {
        return "Failed to save description.";
      }

      setOverview(result.overview);
      return null;
    },
    [projectId],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const refreshInBackground = useCallback(() => refresh({ background: true }), [refresh]);

  return { overview, loading, refreshing, error, refresh: refreshInBackground, saveDescription };
}
