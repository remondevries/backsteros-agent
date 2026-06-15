import { useEffect, useMemo, useState } from "react";
import { useContentPanelBarState } from "../hooks/useContentPanelBarState";
import { fetchLinearTeams, type LinearTeamSummary } from "../lib/api";
import {
  excludeWorkspaceSetupLinearTeams,
  workspaceSetupLinearTeamIdSet,
} from "../lib/workspaceSetupTeamIds";
import {
  EMPTY_BREADCRUMB_SEGMENTS,
  useContentPanelSidebarBreadcrumbs,
} from "./contentPanelNavigation";
import type { LinearSidebarTeamConfig } from "./sidebarNavConfig";

export function OrganizationTeamsList({
  enabled,
  workspaceTeamConfig = {},
}: {
  enabled: boolean;
  workspaceTeamConfig?: LinearSidebarTeamConfig;
}) {
  const [teams, setTeams] = useState<LinearTeamSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const excludedTeamIds = useMemo(
    () => workspaceSetupLinearTeamIdSet(workspaceTeamConfig),
    [workspaceTeamConfig],
  );

  const visibleTeams = useMemo(
    () => excludeWorkspaceSetupLinearTeams(teams, excludedTeamIds),
    [excludedTeamIds, teams],
  );

  useContentPanelSidebarBreadcrumbs(EMPTY_BREADCRUMB_SEGMENTS, enabled);

  useContentPanelBarState({
    error,
    loading: enabled && loading && visibleTeams.length === 0,
    loadingMessage: "Loading teams…",
  });

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchLinearTeams()
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          setError(result.error);
          setTeams([]);
          return;
        }
        setTeams(result.teams ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Couldn't load teams.");
        setTeams([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return (
    <div className="vault-folder-explorer">
      {error ? (
        <p className="vault-folder-explorer-status vault-folder-explorer-status-error">{error}</p>
      ) : null}

      {!loading && !error ? (
        visibleTeams.length > 0 ? (
          <ul className="vault-folder-explorer-list">
            {visibleTeams.map((team) => (
              <li key={team.id} className="vault-folder-explorer-item">
                <span className="vault-folder-explorer-entry vault-folder-explorer-entry-file">
                  <span className="vault-folder-explorer-entry-name">{team.name}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="vault-folder-explorer-status">No teams found.</p>
        )
      ) : null}
    </div>
  );
}
