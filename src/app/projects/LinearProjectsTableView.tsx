import { useMemo } from "react";
import { LinearStatusIcon } from "../../chat/LinearStatusIcon";
import { useLinearProjects } from "../../hooks/useLinearProjects";
import { groupLinearProjectsByStatus } from "../../lib/linearProjectGroups";
import { buildStatusGroupedNavItems } from "../../lib/buildStatusGroupedNavItems";
import { useContentListNavigationRegistration } from "../../lib/contentListNavigationReact";
import { groupVariantFromStatusKey } from "../../lib/groupVariantFromStatusKey";
import { useContentPanelNavigation } from "../contentPanelNavigation";
import { StatusGroupedList } from "../workspace-list/StatusGroupedList";
import { useCollapsibleGroups } from "../workspace-list/useCollapsibleGroups";
import { LinearProjectTableRow } from "./LinearProjectTableRow";

export function LinearProjectsTableView({ enabled }: { enabled: boolean }) {
  const { linearSelection, setLinearSelection } = useContentPanelNavigation();
  const { projects, loading, error } = useLinearProjects(enabled);
  const { collapsedGroups, toggleGroup } = useCollapsibleGroups();

  const groups = useMemo(() => groupLinearProjectsByStatus(projects), [projects]);

  const statusGroups = useMemo(
    () =>
      groups.map((group) => ({
        key: group.status?.id ?? "__none__",
        title: group.label,
        count: group.projects.length,
        items: group.projects,
        variant: groupVariantFromStatusKey(group.label),
        icon: group.status ? (
          <LinearStatusIcon
            status={group.status.name}
            stateType={group.status.type}
            title={group.status.name}
          />
        ) : undefined,
      })),
    [groups],
  );

  const listNavItems = useMemo(
    () =>
      buildStatusGroupedNavItems({
        groups: statusGroups,
        collapsedGroups: collapsedGroups,
        onSelect: (project) =>
          setLinearSelection({
            kind: "project",
            id: project.id,
            name: project.name,
          }),
      }),
    [collapsedGroups, setLinearSelection, statusGroups],
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
        ) : statusGroups.length === 0 ? (
          <p className="linear-projects-table__status">No projects found in your Linear workspace.</p>
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
