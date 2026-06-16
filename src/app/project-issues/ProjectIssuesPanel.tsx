import { useCallback, useMemo, useRef, useState } from "react";
import { LinearStatusIcon } from "../../chat/LinearStatusIcon";
import type { LinearIssueEntity } from "../../chat/types";
import { createInboxDraftIssue } from "../../lib/inboxDraftIssue";
import { linearSync, rollbackOptimisticIssueCreate } from "../../lib/linearSync";
import { seedLinearIssueDetailFromEntity } from "../../lib/linearIssueDetailSeed";
import { useContentPanelBarState } from "../../hooks/useContentPanelBarState";
import { useLinearIssueStatusDragDrop } from "../../hooks/useLinearIssueStatusDragDrop";
import { useLinearProjectIssues } from "../../hooks/useLinearProjectIssues";
import { useLinearWorkspaceTabCreateAction } from "../../hooks/useLinearWorkspaceTabCreateAction";
import { groupVariantFromStatusKey } from "../../lib/groupVariantFromStatusKey";
import { buildStatusGroupedNavItems } from "../../lib/buildStatusGroupedNavItems";
import { useContentListNavigationRegistration } from "../../lib/contentListNavigationReact";
import {
  buildWorkflowStateByCanonical,
  toStatusMoveTargetGroup,
} from "../../lib/linearIssueStatusMove";
import { groupLinearIssuesByWorkflow } from "../../linear/groupLinearIssuesByStatus";
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
  const {
    setActiveLinearIssue,
    activeLinearIssue,
    clearActiveLinearIssue,
  } = useContentPanelNavigation();
  const activeLinearIssueIdRef = useRef(activeLinearIssue?.id ?? null);
  activeLinearIssueIdRef.current = activeLinearIssue?.id ?? null;
  const [createError, setCreateError] = useState<string | null>(null);
  const {
    issues,
    workflowStates,
    loading,
    refreshing,
    error,
    refresh,
    prependIssue,
  } = useLinearProjectIssues(projectId, enabled);
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
    (
      issue: LinearIssueEntity,
      mode: "issue" | "terminal" = "issue",
      options?: { freshCreate?: boolean },
    ) => {
      if (draggingIssueId) return;
      if (mode === "terminal") {
        requestLinearIssueViewMode(issue.id, "terminal");
      }
      seedLinearIssueDetailFromEntity(issue, { freshCreate: options?.freshCreate });
      setActiveLinearIssue({
        id: issue.id,
        identifier: issue.identifier ?? issue.id,
        title: issue.title,
        status: issue.status,
        stateType: issue.stateType,
        projectName: issue.projectName?.trim() || undefined,
      });
    },
    [draggingIssueId, setActiveLinearIssue],
  );

  const handleCreateIssue = useCallback(() => {
    if (!enabled) return;

    setCreateError(null);
    const draft = createInboxDraftIssue();

    prependIssue(draft);
    openLinearIssue(draft, "issue", { freshCreate: true });

    void linearSync.enqueueIssueCreate({
      kind: "project",
      projectId,
      localIssue: draft,
    }).catch((err) => {
      rollbackOptimisticIssueCreate(draft.id);
      if (activeLinearIssueIdRef.current === draft.id) {
        clearActiveLinearIssue();
      }
      setCreateError(err instanceof Error ? err.message : "Failed to create issue.");
    });
  }, [
    clearActiveLinearIssue,
    enabled,
    openLinearIssue,
    prependIssue,
    projectId,
  ]);

  useLinearWorkspaceTabCreateAction(
    enabled
      ? {
          disabled: false,
          label: "New issue",
          onCreate: () => {
            void handleCreateIssue();
          },
        }
      : null,
  );

  const workflowStateByCanonical = useMemo(
    () => buildWorkflowStateByCanonical(workflowStates),
    [workflowStates],
  );

  const groups = useMemo(() => {
    return groupLinearIssuesByWorkflow(effectiveIssues, workflowStates).map((group) => ({
      key: group.stateId ?? group.status,
      title: group.status,
      count: group.issues.length,
      items: group.issues,
      variant: groupVariantFromStatusKey(group.status),
      icon: (
        <LinearStatusIcon
          status={group.status}
          stateType={group.stateType}
          stateId={group.stateId ?? group.issues[0]?.stateId}
          statusColor={group.statusColor}
          workflowStates={workflowStates}
          title={group.status}
        />
      ),
      dropTarget: toStatusMoveTargetGroup({
        status: group.status,
        displayStatus: group.status,
        stateId: group.stateId,
        stateType: group.stateType,
        statusColor: group.statusColor,
        issues: group.issues,
        workflowStateByCanonical,
      }),
    }));
  }, [effectiveIssues, workflowStateByCanonical, workflowStates]);

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
    return <div className="workspace-status-list-scroll" aria-busy="true" />;
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

  if (issues.length === 0 && workflowStates.length === 0) {
    return (
      <div className="workspace-status-list-scroll">
        {createError ? (
          <div className="workspace-status-list-error workspace-status-list-error--inline" role="alert">
            {createError}
          </div>
        ) : null}
        <div className="workspace-status-list-empty">
          <p>No issues in this project.</p>
        </div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="workspace-status-list-scroll">
        {createError ? (
          <div className="workspace-status-list-error workspace-status-list-error--inline" role="alert">
            {createError}
          </div>
        ) : null}
        <div className="workspace-status-list-empty">
          <p>No issues in this project.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-status-list-scroll">
      {createError ? (
        <div className="workspace-status-list-error workspace-status-list-error--inline" role="alert">
          {createError}
        </div>
      ) : null}
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
            workflowStates={workflowStates}
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
