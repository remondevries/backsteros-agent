import { useCallback, useEffect, useState } from "react";
import {
  fetchAllLinearProjects,
  fetchLinearProjectStatuses,
  type LinearProjectSummary,
} from "../lib/api";
import {
  collectLinearProjectStatusesFromProjects,
  type LinearProjectStatusForIcon,
} from "../lib/linearProjectStatusIcon";

export function useLinearProjects(enabled: boolean) {
  const [projects, setProjects] = useState<LinearProjectSummary[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<LinearProjectStatusForIcon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setProjects([]);
      setProjectStatuses([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const projectsResult = await fetchAllLinearProjects();
      setProjects(projectsResult.projects);

      try {
        const statusesResult = await fetchLinearProjectStatuses();
        const workspaceStatuses = statusesResult.statuses ?? [];
        setProjectStatuses(
          workspaceStatuses.length > 0
            ? workspaceStatuses
            : collectLinearProjectStatusesFromProjects(projectsResult.projects),
        );
      } catch {
        setProjectStatuses(collectLinearProjectStatusesFromProjects(projectsResult.projects));
      }
    } catch (err) {
      setProjects([]);
      setProjectStatuses([]);
      setError(err instanceof Error ? err.message : "Failed to load Linear projects");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { projects, projectStatuses, loading, error, refresh };
}
