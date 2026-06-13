import { useMemo, useState } from "react";
import { useLinearProjects } from "../hooks/useLinearProjects";
import { useLinearTeams } from "../hooks/useLinearTeams";
import { groupLinearProjectsByStatus } from "../lib/linearProjectGroups";
import { useContentPanelNavigation, useContentPanelSidebarBreadcrumbs } from "./contentPanelNavigation";
import {
  LinearWorkspaceViewToggle,
  type LinearWorkspaceView,
} from "./LinearWorkspaceViewToggle";

function matchesSearch(value: string, query: string) {
  return value.toLowerCase().includes(query);
}

export function LinearWorkspacePanel({ enabled }: { enabled: boolean }) {
  const { linearSelection, setLinearSelection } = useContentPanelNavigation();
  const [view, setView] = useState<LinearWorkspaceView>("teams");
  const [search, setSearch] = useState("");
  const [collapsedProjectGroups, setCollapsedProjectGroups] = useState<Set<string>>(() => new Set());
  const teamsQuery = useLinearTeams(enabled && view === "teams");
  const projectsQuery = useLinearProjects(enabled && view === "projects");
  const normalizedSearch = search.trim().toLowerCase();

  useContentPanelSidebarBreadcrumbs(
    useMemo(
      () => [
        {
          id: `linear-view-${view}`,
          label: view === "teams" ? "Teams" : "Projects",
        },
      ],
      [view],
    ),
    enabled,
  );

  const filteredTeams = useMemo(() => {
    if (!normalizedSearch) return teamsQuery.teams;
    return teamsQuery.teams.filter(
      (team) =>
        matchesSearch(team.name, normalizedSearch) || matchesSearch(team.key, normalizedSearch),
    );
  }, [normalizedSearch, teamsQuery.teams]);

  const filteredProjects = useMemo(() => {
    if (!normalizedSearch) return projectsQuery.projects;
    return projectsQuery.projects.filter(
      (project) =>
        matchesSearch(project.name, normalizedSearch) ||
        (project.status?.name ? matchesSearch(project.status.name, normalizedSearch) : false) ||
        (project.slugId ? matchesSearch(project.slugId, normalizedSearch) : false),
    );
  }, [normalizedSearch, projectsQuery.projects]);

  const groupedProjects = useMemo(
    () => groupLinearProjectsByStatus(filteredProjects),
    [filteredProjects],
  );

  const toggleProjectGroup = (groupKey: string) => {
    setCollapsedProjectGroups((current) => {
      const next = new Set(current);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  return (
    <div className="vault-folder-explorer linear-workspace-panel">
      <div className="linear-workspace-toolbar">
        <label className="sidebar-explorer-search-field">
          <span className="sidebar-explorer-search-label">Search</span>
          <input
            type="search"
            className="sidebar-explorer-search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={view === "teams" ? "Search teams…" : "Search projects…"}
            disabled={!enabled}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <LinearWorkspaceViewToggle view={view} onChange={setView} disabled={!enabled} />
      </div>

      <div className="linear-workspace-list">
        {!enabled ? (
          <p className="vault-folder-explorer-status">
            Connect Linear in Settings to browse teams and projects.
          </p>
        ) : view === "teams" ? (
          <>
            {teamsQuery.loading ? (
              <p className="vault-folder-explorer-status">Loading teams…</p>
            ) : null}
            {teamsQuery.error ? (
              <p className="vault-folder-explorer-status vault-folder-explorer-status-error">
                {teamsQuery.error}
              </p>
            ) : null}
            {!teamsQuery.loading && !teamsQuery.error ? (
              filteredTeams.length > 0 ? (
                <ul className="vault-folder-explorer-list" aria-label="Linear teams">
                  {filteredTeams.map((team) => {
                    const selected =
                      linearSelection?.kind === "team" && linearSelection.id === team.id;
                    return (
                      <li key={team.id} className="vault-folder-explorer-item">
                        <button
                          type="button"
                          className={[
                            "vault-folder-explorer-entry",
                            "vault-folder-explorer-entry-selectable",
                            selected ? "vault-folder-explorer-entry-selected" : null,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          aria-current={selected ? "page" : undefined}
                          onClick={() =>
                            setLinearSelection({ kind: "team", id: team.id, name: team.name })
                          }
                        >
                          <span className="vault-folder-explorer-entry-name">{team.name}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="vault-folder-explorer-status">
                  {normalizedSearch
                    ? "No teams match your search."
                    : "No teams found in your Linear workspace."}
                </p>
              )
            ) : null}
          </>
        ) : (
          <>
            {projectsQuery.loading ? (
              <p className="vault-folder-explorer-status">Loading projects…</p>
            ) : null}
            {projectsQuery.error ? (
              <p className="vault-folder-explorer-status vault-folder-explorer-status-error">
                {projectsQuery.error}
              </p>
            ) : null}
            {!projectsQuery.loading && !projectsQuery.error ? (
              groupedProjects.length > 0 ? (
                <div className="linear-project-groups" aria-label="Linear projects">
                  {groupedProjects.map((group) => {
                    const groupKey = group.status?.id ?? "no-status";
                    const collapsed = collapsedProjectGroups.has(groupKey);
                    return (
                    <section
                      key={groupKey}
                      className="linear-project-group"
                      aria-labelledby={`linear-project-group-${groupKey}`}
                    >
                      <button
                        type="button"
                        id={`linear-project-group-${groupKey}`}
                        className="linear-project-group-header"
                        aria-expanded={!collapsed}
                        onClick={() => toggleProjectGroup(groupKey)}
                      >
                        <span
                          className={[
                            "sidebar-list-group-chevron",
                            !collapsed ? "sidebar-list-group-chevron--expanded" : null,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          aria-hidden="true"
                        >
                          &gt;
                        </span>
                        <span className="sidebar-list-group-title">{group.label}</span>
                        <span className="sidebar-list-group-count">{group.projects.length}</span>
                      </button>
                      {!collapsed ? (
                      <ul className="vault-folder-explorer-list">
                        {group.projects.map((project) => {
                          const selected =
                            linearSelection?.kind === "project" &&
                            linearSelection.id === project.id;
                          return (
                            <li key={project.id} className="vault-folder-explorer-item">
                              <button
                                type="button"
                                className={[
                                  "vault-folder-explorer-entry",
                                  "vault-folder-explorer-entry-selectable",
                                  selected ? "vault-folder-explorer-entry-selected" : null,
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                aria-current={selected ? "page" : undefined}
                                onClick={() =>
                                  setLinearSelection({
                                    kind: "project",
                                    id: project.id,
                                    name: project.name,
                                  })
                                }
                              >
                                <span className="vault-folder-explorer-entry-name">
                                  {project.name}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                      ) : null}
                    </section>
                    );
                  })}
                </div>
              ) : (
                <p className="vault-folder-explorer-status">
                  {normalizedSearch
                    ? "No projects match your search."
                    : "No projects found in your Linear workspace."}
                </p>
              )
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
