import { useCallback, useMemo } from "react";
import { LinearStatusIcon } from "../../chat/LinearStatusIcon";
import type { LinearIssueEntity } from "../../chat/types";
import { useContentPanelBarState } from "../../hooks/useContentPanelBarState";
import { useLinearIssueStatusDragDrop } from "../../hooks/useLinearIssueStatusDragDrop";
import { useLinearProjectIssues } from "../../hooks/useLinearProjectIssues";
import { groupVariantFromStatusKey } from "../../lib/groupVariantFromStatusKey";
import { buildStatusGroupedNavItems } from "../../lib/buildStatusGroupedNavItems";
import { useContentListNavigationRegistration } from "../../lib/contentListNavigationReact";
import {
  buildWorkflowStateByCanonical,
  toStatusMoveTargetGroup,
} from "../../lib/linearIssueStatusMove";
import { groupLinearIssuesByStatus } from "../../linear/groupLinearIssuesByStatus";
import { useContentPanelNavigation } from "../contentPanelNavigation";
import { StatusGroupedList } from "../workspace-list/StatusGroupedList";
import { useCollapsibleGroups } from "../workspace-list/useCollapsibleGroups";
import { ProjectIssueRow } from "./ProjectIssueRow";
import { requestLinearIssueViewMode } from "./issueViewModeIntent";

export function ProjectIssuesPanel({
  projectId,
  enabled,
}: {
  projectId: string;
  enabled: boolean;
}) {
  const { setActiveLinearIssue, activeLinearIssue } = useContentPanelNavigation();
  const { issues, workflowStates, loading, refreshing, error, refresh } = useLinearProjectIssues(
    projectId,
    enabled,
  );
  const { collapsedGroups, toggleGroup } = useCollapsibleGroups();

  const {
    effectiveIssues,
    moveError,
    draggingIssueId,
    dropIndicator,
    handlePointerDragStart,
    handleGroupDragOver,
    handlePointerGroupEnter,
    handleGroupDrop,
    handleGroupMouseUp,
  } = useLinearIssueStatusDragDrop({
    issues,
    refresh,
  });

  useContentPanelBarState({
    error: moveError ?? error,
    loading: loading && issues.length === 0,
    loadingMessage: "Loading issues…",
    refreshing,
    onRefresh: refresh,
  });

  const openLinearIssue = useCallback(
    (issue: LinearIssueEntity, mode: "issue" | "terminal" = "issue") => {
      if (draggingIssueId) return;
      if (mode === "terminal") {
        requestLinearIssueViewMode(issue.id, "terminal");
      }
      setActiveLinearIssue({
        id: issue.id,
        identifier: issue.identifier ?? issue.id,
        title: issue.title,
        status: issue.status,
        stateType: issue.stateType,
      });
    },
    [draggingIssueId, setActiveLinearIssue],
  );

  const workflowStateByCanonical = useMemo(
    () => buildWorkflowStateByCanonical(workflowStates),
    [workflowStates],
  );

  const groups = useMemo(() => {
    return groupLinearIssuesByStatus(effectiveIssues).map((group) => ({
      key: group.status,
      title: group.status,
      count: group.issues.length,
      items: group.issues,
      variant: groupVariantFromStatusKey(group.status),
      icon: (
        <LinearStatusIcon
          status={group.status}
          stateType={group.stateType}
          title={group.status}
        />
      ),
      dropTarget: toStatusMoveTargetGroup({
        status: group.status,
        displayStatus: group.status,
        stateType: group.stateType,
        statusColor: group.statusColor,
        issues: group.issues,
        workflowStateByCanonical,
      }),
    }));
  }, [effectiveIssues, workflowStateByCanonical]);

  const listNavItems = useMemo(
    () =>
      buildStatusGroupedNavItems({
        groups,
        collapsedGroups,
        groupHeaderIdPrefix: "project-issues-group",
        onToggleGroup: toggleGroup,
        onSelect: (issue) => openLinearIssue(issue),
      }),
    [collapsedGroups, groups, openLinearIssue, toggleGroup],
  );

  useContentListNavigationRegistration({
    region: "main",
    enabled: enabled && listNavItems.length > 0,
    items: listNavItems,
    selectedId: activeLinearIssue?.id ?? null,
  });

  if (loading && issues.length === 0) {
    return (
      <div className="workspace-status-list-scroll">
        <div className="workspace-status-list-loading">
          <p>Loading issues…</p>
        </div>
      </div>
    );
  }

  const panelError = moveError ?? error;
  if (panelError) {
    return (
      <div className="workspace-status-list-scroll">
        <div className="workspace-status-list-error" role="alert">
          {panelError}
        </div>
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="workspace-status-list-scroll">
        <div className="workspace-status-list-empty">
          <p>No issues in this project.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-status-list-scroll">
      <StatusGroupedList
        className="workspace-status-list workspace-status-list--issues"
        groups={groups}
        collapsedGroups={collapsedGroups}
        onToggleGroup={toggleGroup}
        idPrefix="project-issues-group"
        dragDrop={{
          draggingIssueId,
          dropIndicator,
          onPointerDragStart: handlePointerDragStart,
          onGroupDragOver: handleGroupDragOver,
          onGroupMouseEnter: handlePointerGroupEnter,
          onGroupDrop: handleGroupDrop,
          onGroupMouseUp: handleGroupMouseUp,
        }}
        renderItem={(issue) => (
          <ProjectIssueRow
            key={issue.id}
            issue={issue}
            grouped
            dragging={draggingIssueId === issue.id}
            onPointerDragStart={handlePointerDragStart}
            onClick={() => {
              openLinearIssue(issue);
            }}
            onTerminalIndicatorClick={() => {
              openLinearIssue(issue, "terminal");
            }}
          />
        )}
      />
    </div>
  );
}
