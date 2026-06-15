import { useMemo, useState } from "react";
import { useProjectsBrowseSearchBreadcrumbAction } from "../../hooks/useProjectsBrowseSearchBreadcrumbAction";
import { useWorkspaceSetupTeamProjectIds } from "../../hooks/useWorkspaceSetupTeamProjectIds";
import { LinearProjectStatusIcon } from "../../chat/LinearProjectStatusIcon";
import { useLinearProjects } from "../../hooks/useLinearProjects";
import { useLinearTeamProjects } from "../../hooks/useLinearTeamProjects";
import { groupLinearProjectsByWorkflow } from "../../lib/linearProjectGroups";
import { excludeWorkspaceSetupTeamProjects } from "../../lib/workspaceSetupTeamIds";
import { buildStatusGroupedNavItems } from "../../lib/buildStatusGroupedNavItems";
import { useContentListNavigationRegistration } from "../../lib/contentListNavigationReact";
import { groupVariantFromStatusKey } from "../../lib/groupVariantFromStatusKey";
import { useContentPanelNavigation } from "../contentPanelNavigation";
import type { LinearSidebarTeamConfig } from "../sidebarNavConfig";
import { StatusGroupedList } from "../workspace-list/StatusGroupedList";
import { useCollapsibleGroups } from "../workspace-list/useCollapsibleGroups";
import { LinearProjectTableRow } from "./LinearProjectTableRow";

function matchesProjectSearch(value: string, query: string) {
  return value.toLowerCase().includes(query);
}

export function LinearProjectsTableView({
  enabled,
  teamId = null,
  workspaceTeamConfig = {},
}: {
  enabled: boolean;
  teamId?: string | null;
  workspaceTeamConfig?: LinearSidebarTeamConfig;
}) {
  const { linearSelection, setLinearSelection } = useContentPanelNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedTeamId = teamId?.trim() || null;
  const filterByTeam = Boolean(normalizedTeamId);
  const normalizedSearch = searchQuery.trim().toLowerCase();

  useProjectsBrowseSearchBreadcrumbAction(
    enabled
      ? {
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: filterByTeam ? "Search organization projects…" : "Search projects…",
          ariaLabel: filterByTeam ? "Search organization projects" : "Search projects",
          disabled: !enabled,
        }
      : null,
  );
  const { projects: allProjects, projectStatuses, loading: allLoading, error: allError } =
    useLinearProjects(enabled);
  const {
    projects: teamProjects,
    loading: teamLoading,
    error: teamError,
  } = useLinearTeamProjects(normalizedTeamId, enabled && filterByTeam);
  const {
    excludedProjectIds,
    loading: workspaceExclusionsLoading,
    error: workspaceExclusionsError,
  } = useWorkspaceSetupTeamProjectIds(workspaceTeamConfig, enabled && !filterByTeam);
  const { collapsedGroups, toggleGroup } = useCollapsibleGroups();

  const projects = useMemo(() => {
    if (filterByTeam) {
      const teamProjectIds = new Set(teamProjects.map((project) => project.id));
      return allProjects.filter((project) => teamProjectIds.has(project.id));
    }
    return excludeWorkspaceSetupTeamProjects(allProjects, excludedProjectIds);
  }, [allProjects, excludedProjectIds, filterByTeam, teamProjects]);

  const filteredProjects = useMemo(() => {
    if (!normalizedSearch) return projects;
    return projects.filter(
      (project) =>
        matchesProjectSearch(project.name, normalizedSearch) ||
        (project.status?.name ? matchesProjectSearch(project.status.name, normalizedSearch) : false) ||
        (project.slugId ? matchesProjectSearch(project.slugId, normalizedSearch) : false),
    );
  }, [normalizedSearch, projects]);

  const loading = filterByTeam
    ? allLoading || teamLoading
    : allLoading || workspaceExclusionsLoading;
  const error = allError ?? teamError ?? workspaceExclusionsError;

  const groups = useMemo(
    () => groupLinearProjectsByWorkflow(filteredProjects, projectStatuses),
    [filteredProjects, projectStatuses],
  );

  const statusGroups = useMemo(
    () =>
      groups.map((group) => ({
        key: group.status?.id ?? "__none__",
        title: group.label,
        count: group.projects.length,
        items: group.projects,
        variant: groupVariantFromStatusKey(group.label),
        icon: group.status ? (
          <LinearProjectStatusIcon
            status={group.status.name}
            stateType={group.status.type}
            stateId={group.status.id}
            statusPosition={group.status.position}
            projectStatuses={projectStatuses}
            title={group.status.name}
          />
        ) : undefined,
      })),
    [groups, projectStatuses],
  );

  const listNavItems = useMemo(
    () =>
      buildStatusGroupedNavItems({
        groups: statusGroups,
        collapsedGroups: collapsedGroups,
        groupHeaderIdPrefix: "linear-projects-group",
        onToggleGroup: toggleGroup,
        onSelect: (project) =>
          setLinearSelection({
            kind: "project",
            id: project.id,
            name: project.name,
          }),
      }),
    [collapsedGroups, setLinearSelection, statusGroups, toggleGroup],
  );

  const selectedListId =
    linearSelection?.kind === "project" ? linearSelection.id : null;

  useContentListNavigationRegistration({
    region: "main",
    enabled: enabled && listNavItems.length > 0,
    items: listNavItems,
    selectedId: selectedListId,
  });

  return (
    <div className="linear-projects-table">
      <div className="linear-projects-table__header" aria-hidden="true">
        <span className="linear-projects-table__header-name">Name</span>
        <span className="linear-projects-table__header-cell linear-projects-table__header-health">
          Health
        </span>
        <span className="linear-projects-table__header-cell linear-projects-table__header-priority">
          Priority
        </span>
        <span className="linear-projects-table__header-cell linear-projects-table__header-date">
          Start date
        </span>
        <span className="linear-projects-table__header-cell linear-projects-table__header-issues">
          Issues
        </span>
        <span className="linear-projects-table__header-cell linear-projects-table__header-status">
          Status
        </span>
      </div>

      <div className="linear-projects-table__body">
        {!enabled ? (
          <p className="linear-projects-table__status">
            Connect Linear in Settings to browse projects.
          </p>
        ) : loading ? (
          <p className="linear-projects-table__status">Loading projects…</p>
        ) : error ? (
          <p className="linear-projects-table__status linear-projects-table__status--error">
            {error}
          </p>
        ) : groups.length === 0 ? (
          <p className="linear-projects-table__status">
            {normalizedSearch
              ? "No projects match your search."
              : filterByTeam
                ? "No projects for this organization yet."
                : "No projects found in your Linear workspace."}
          </p>
        ) : (
          <div className="workspace-status-list-scroll">
            <StatusGroupedList
              groups={statusGroups}
              collapsedGroups={collapsedGroups}
              onToggleGroup={toggleGroup}
              className="linear-projects-table__list"
              listClassName="linear-projects-table__groups"
              idPrefix="linear-projects-group"
              renderItem={(project) => (
                <LinearProjectTableRow
                  key={project.id}
                  project={project}
                  projectStatuses={projectStatuses}
                  selected={
                    linearSelection?.kind === "project" && linearSelection.id === project.id
                  }
                  onSelect={() =>
                    setLinearSelection({
                      kind: "project",
                      id: project.id,
                      name: project.name,
                    })
                  }
                />
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}
