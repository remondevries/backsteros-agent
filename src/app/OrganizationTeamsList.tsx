import { useEffect, useState } from "react";
import { fetchLinearTeams, type LinearTeamSummary } from "../lib/api";
import {
  EMPTY_BREADCRUMB_SEGMENTS,
  useContentPanelSidebarBreadcrumbs,
} from "./contentPanelNavigation";

export function OrganizationTeamsList({ enabled }: { enabled: boolean }) {
  const [teams, setTeams] = useState<LinearTeamSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useContentPanelSidebarBreadcrumbs(EMPTY_BREADCRUMB_SEGMENTS, enabled);

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
      {loading ? <p className="vault-folder-explorer-status">Loading…</p> : null}
      {error ? (
        <p className="vault-folder-explorer-status vault-folder-explorer-status-error">{error}</p>
      ) : null}

      {!loading && !error ? (
        teams.length > 0 ? (
          <ul className="vault-folder-explorer-list">
            {teams.map((team) => (
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
