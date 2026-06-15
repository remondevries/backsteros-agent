import { useCallback, useEffect, useState } from "react";
import { fetchLinearTeamProjects, type LinearTeamProjectSummary } from "../lib/api";

export function useLinearTeamProjects(teamId: string | null, enabled: boolean) {
  const [projects, setProjects] = useState<LinearTeamProjectSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (options?: { background?: boolean }) => {
      if (!enabled || !teamId) {
        setProjects([]);
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
        const result = await fetchLinearTeamProjects(teamId);
        if (result.error) {
          setError(result.error);
          setProjects([]);
        } else {
          setProjects(result.projects);
        }
      } catch (err) {
        setProjects([]);
        setError(err instanceof Error ? err.message : "Failed to load projects");
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

  const prependProject = useCallback((project: LinearTeamProjectSummary) => {
    setProjects((current) => {
      if (current.some((item) => item.id === project.id)) {
        return current;
      }
      return [...current, project].sort((left, right) => left.name.localeCompare(right.name));
    });
  }, []);

  return {
    projects,
    loading,
    refreshing,
    error,
    refresh: refreshInBackground,
    prependProject,
  };
}
