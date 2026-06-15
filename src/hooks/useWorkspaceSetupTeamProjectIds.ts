import { useEffect, useMemo, useState } from "react";
import { fetchLinearTeamProjects } from "../lib/api";
import { collectWorkspaceSetupLinearTeamIds } from "../lib/workspaceSetupTeamIds";
import type { LinearSidebarTeamConfig } from "../app/sidebarNavConfig";

export function useWorkspaceSetupTeamProjectIds(
  workspaceTeamConfig: LinearSidebarTeamConfig,
  enabled: boolean,
) {
  const teamIds = useMemo(
    () => collectWorkspaceSetupLinearTeamIds(workspaceTeamConfig),
    [workspaceTeamConfig],
  );
  const [excludedProjectIds, setExcludedProjectIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || teamIds.length === 0) {
      setExcludedProjectIds(new Set());
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void Promise.all(teamIds.map((teamId) => fetchLinearTeamProjects(teamId)))
      .then((results) => {
        if (cancelled) return;
        const ids = new Set<string>();
        for (const result of results) {
          if (result.error) {
            throw new Error(result.error);
          }
          for (const project of result.projects) {
            ids.add(project.id);
          }
        }
        setExcludedProjectIds(ids);
      })
      .catch((err) => {
        if (cancelled) return;
        setExcludedProjectIds(new Set());
        setError(err instanceof Error ? err.message : "Failed to load workspace team projects");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, teamIds]);

  return { excludedProjectIds, loading, error };
}
