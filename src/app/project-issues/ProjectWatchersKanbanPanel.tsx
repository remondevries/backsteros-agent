import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { LinearAssigneeAvatar } from "../../chat/LinearAssigneeAvatar";
import { DotScrollLoader } from "../../chat/DotScrollLoader";
import { getPriorityLabel } from "../../chat/linearPriority";
import { LinearStatusIcon } from "../../chat/LinearStatusIcon";
import type { LinearIssueEntity } from "../../chat/types";
import { useContentPanelBarState } from "../../hooks/useContentPanelBarState";
import { useLinearProjectIssues } from "../../hooks/useLinearProjectIssues";
import { fetchLinearIssueDetail, updateLinearIssueDetail } from "../../lib/api";
import { formatIssueDueMetaLabel, linearIssueTitleForCardDisplay } from "../../lib/linearIssueDisplay";
import { resolveTerminalLeafId } from "../../modules/terminal/leafId";
import {
  useLeafAgentWaiting,
  useLeafAgentWorking,
  useLeafSessionActive,
} from "../../modules/terminal/lib/useTerminalSession";
import { groupLinearIssuesByStatus } from "../../linear/groupLinearIssuesByStatus";
import { VirtualList } from "../../ui/VirtualList";
import { useContentPanelNavigation } from "../contentPanelNavigation";
import { requestLinearIssueViewMode } from "./issueViewModeIntent";
import { LinearIssueEstimateIcon } from "./LinearIssueDetailsPropertyDropdown";

const CREATED_AT_THIS_YEAR_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const CREATED_AT_WITH_YEAR_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const BOARD_STATUS_COLUMNS = [
  { key: "triage", label: "Triage", stateType: "triage" },
  { key: "backlog", label: "Backlog", stateType: "backlog" },
  { key: "ready to start", label: "Ready to Start", stateType: "unstarted" },
  { key: "in progress", label: "In Progress", stateType: "started" },
  { key: "on hold", label: "On Hold", stateType: "started" },
  { key: "in review", label: "In Review", stateType: "started" },
  { key: "done", label: "Done", stateType: "completed" },
  { key: "canceled", label: "Canceled", stateType: "canceled" },
  { key: "duplicated", label: "Duplicated", stateType: "canceled" },
] as const;

type BoardStatusColumn = (typeof BOARD_STATUS_COLUMNS)[number];

type WatchersBoardGroup = ReturnType<typeof groupLinearIssuesByStatus>[number] & {
  canonicalKey: string;
  displayStatus: string;
  stateId: string | null;
};

type BoardIssueOverride = {
  stateId: string;
  status: string;
  stateType?: string;
  statusColor?: string;
};

type DropIndicator = {
  stateId: string;
  beforeIssueId: string | null;
};

type DragPreview = {
  issue: LinearIssueEntity;
  width: number;
  x: number;
  y: number;
};

function canonicalStatusKey(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "completed") return "done";
  if (normalized === "cancelled") return "canceled";
  if (normalized === "duplicate") return "duplicated";
  return normalized;
}

function formatIssueCreatedAtLabel(value: string | undefined): string | null {
  const createdAt = value?.trim();
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const formatter =
    date.getFullYear() === now.getFullYear()
      ? CREATED_AT_THIS_YEAR_FORMATTER
      : CREATED_AT_WITH_YEAR_FORMATTER;
  return `Created ${formatter.format(date)}`;
}

function compareIssuesForBoard(left: LinearIssueEntity, right: LinearIssueEntity): number {
  const leftPriority = left.priority ?? 99;
  const rightPriority = right.priority ?? 99;
  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }
  const leftLabel = left.identifier ?? left.title;
  const rightLabel = right.identifier ?? right.title;
  return leftLabel.localeCompare(rightLabel);
}

function resolveWorkflowStateForColumn(
  column: BoardStatusColumn,
  workflowStates: Array<{ id: string; name: string; type: string; color?: string }>,
): { id: string; name: string; type: string; color?: string } | undefined {
  const exactByName = workflowStates.find(
    (state) => canonicalStatusKey(state.name) === column.key,
  );
  if (exactByName) return exactByName;

  const byType = workflowStates.filter(
    (state) => state.type.trim().toLowerCase() === column.stateType.trim().toLowerCase(),
  );
  if (byType.length === 0) return undefined;

  if (column.key === "in progress") {
    return (
      byType.find((state) => /in[\s-]?progress|progress/i.test(state.name)) ??
      byType.find((state) => /active|doing|working/i.test(state.name)) ??
      byType[0]
    );
  }
  if (column.key === "on hold") {
    return (
      byType.find((state) => /hold|blocked|paused|pause|stuck/i.test(state.name)) ?? byType[0]
    );
  }
  if (column.key === "in review") {
    return (
      byType.find((state) => /review|qa|verify|approval|approve/i.test(state.name)) ??
      byType[0]
    );
  }
  if (column.key === "duplicated") {
    return byType.find((state) => /duplicate|duplicated|dupe/i.test(state.name)) ?? byType[0];
  }
  if (column.key === "canceled") {
    return (
      byType.find((state) => /cancel|cancelled|canceled|wontfix|won't fix/i.test(state.name)) ??
      byType[0]
    );
  }

  return byType[0];
}

function resolveWorkflowStateFromList(
  states: Array<{ id: string; name: string; type: string }>,
  targetKey: string,
  targetStateType?: string,
): { id: string; name: string; type: string } | null {
  const exactByName = states.find((state) => canonicalStatusKey(state.name) === targetKey);
  if (exactByName) return exactByName;
  const type = targetStateType?.trim().toLowerCase();
  if (!type) return null;

  const byType = states.filter((state) => state.type.trim().toLowerCase() === type);
  if (byType.length === 0) return null;
  if (targetKey === "in progress") {
    return (
      byType.find((state) => /in[\s-]?progress|progress/i.test(state.name)) ??
      byType.find((state) => /active|doing|working/i.test(state.name)) ??
      byType[0]
    );
  }
  if (targetKey === "on hold") {
    return byType.find((state) => /hold|blocked|paused|pause|stuck/i.test(state.name)) ?? byType[0];
  }
  if (targetKey === "in review") {
    return (
      byType.find((state) => /review|qa|verify|approval|approve/i.test(state.name)) ?? byType[0]
    );
  }
  if (targetKey === "duplicated") {
    return byType.find((state) => /duplicate|duplicated|dupe/i.test(state.name)) ?? byType[0];
  }
  if (targetKey === "canceled") {
    return (
      byType.find((state) => /cancel|cancelled|canceled|wontfix|won't fix/i.test(state.name)) ??
      byType[0]
    );
  }
  return byType[0];
}

function computeDropIndicator(
  group: WatchersBoardGroup,
  draggedIssue: LinearIssueEntity,
): DropIndicator | null {
  const stateId = group.stateId?.trim();
  if (!stateId) return null;
  if (draggedIssue.stateId?.trim() === stateId) return null;

  const targetIssues = group.issues.filter((issue) => issue.id !== draggedIssue.id);
  let insertionIndex = targetIssues.length;
  for (let index = 0; index < targetIssues.length; index += 1) {
    if (compareIssuesForBoard(draggedIssue, targetIssues[index]!) < 0) {
      insertionIndex = index;
      break;
    }
  }

  return {
    stateId,
    beforeIssueId: targetIssues[insertionIndex]?.id ?? null,
  };
}

function ProjectWatchersIssueCard({
  issue,
  onOpen,
  onOpenTerminal,
  onPointerDragStart,
  dragging,
}: {
  issue: LinearIssueEntity;
  onOpen: (issue: LinearIssueEntity) => void;
  onOpenTerminal: (issue: LinearIssueEntity) => void;
  onPointerDragStart: (issue: LinearIssueEntity, event: MouseEvent<HTMLButtonElement>) => void;
  dragging: boolean;
}) {
  const terminalLeafId = useMemo(() => resolveTerminalLeafId(issue.id), [issue.id]);
  const terminalSessionActive = useLeafSessionActive(terminalLeafId);
  const terminalAgentWorking = useLeafAgentWorking(terminalLeafId);
  const terminalAgentWaiting = useLeafAgentWaiting(terminalLeafId);
  const issueId = issue.identifier?.trim() || issue.id;
  const dueLabel = formatIssueDueMetaLabel(issue.dueDate);
  const priorityLabel = (issue.priorityLabel?.trim() || getPriorityLabel(issue.priority)).trim();
  const estimateLabel =
    typeof issue.estimate === "number"
      ? `${issue.estimate} pt${issue.estimate === 1 ? "" : "s"}`
      : null;
  const tags = (issue.labels ?? []).filter((label) => label.name.trim().length > 0);
  const createdAtLabel = formatIssueCreatedAtLabel(issue.createdAt);
  const assignee = issue.assigneeName?.trim() || null;
  const displayTitle = linearIssueTitleForCardDisplay(issue.title);
  const hasTerminalIndicator = terminalSessionActive;

  const isTerminalIndicatorTarget = (event: MouseEvent<HTMLButtonElement>): boolean => {
    const target = event.target as HTMLElement | null;
    return Boolean(target?.closest('[data-terminal-indicator="true"]'));
  };

  return (
    <li className="project-watchers-kanban-card-item">
      <button
        type="button"
        className={[
          "project-watchers-kanban-card",
          dragging ? "project-watchers-kanban-card--dragging" : null,
        ]
          .filter(Boolean)
          .join(" ")}
        draggable={false}
        onMouseDown={(event) => {
          if (hasTerminalIndicator && isTerminalIndicatorTarget(event)) {
            return;
          }
          onPointerDragStart(issue, event);
        }}
        onClick={(event) => {
          if (hasTerminalIndicator && isTerminalIndicatorTarget(event)) {
            onOpenTerminal(issue);
            return;
          }
          onOpen(issue);
        }}
      >
        <span className="project-watchers-kanban-card-top">
          <span className="project-watchers-kanban-card-id" title={issueId}>
            {issueId}
          </span>
          <span className="project-watchers-kanban-card-owner" title={assignee ?? "Unassigned"}>
            <LinearAssigneeAvatar name={assignee ?? undefined} avatarUrl={issue.assigneeAvatarUrl} />
          </span>
        </span>
        <span className="project-watchers-kanban-card-title-row">
          <span
            className="project-watchers-kanban-card-status"
            title={
              terminalSessionActive
                ? terminalAgentWorking
                  ? "Terminal agent working"
                  : terminalAgentWaiting
                    ? "Terminal agent waiting"
                    : "Terminal session active"
                : issue.status?.trim() || "Unknown"
            }
          >
            {terminalSessionActive && terminalAgentWorking ? (
              <DotScrollLoader
                className="project-watchers-kanban-card-terminal-loader"
                aria-label="Agent working in terminal"
                data-terminal-indicator="true"
              />
            ) : null}
            {terminalSessionActive && terminalAgentWaiting ? (
              <DotScrollLoader
                className="project-watchers-kanban-card-terminal-loader"
                status="waiting"
                aria-label="Agent waiting in terminal"
                data-terminal-indicator="true"
              />
            ) : null}
            {terminalSessionActive && !terminalAgentWorking && !terminalAgentWaiting ? (
              <span
                className="linear-issue-terminal-session-dot project-watchers-kanban-card-terminal-dot"
                aria-hidden="true"
                data-terminal-indicator="true"
              />
            ) : null}
            {!terminalSessionActive ? (
              <LinearStatusIcon
                status={issue.status}
                stateType={issue.stateType}
                title={issue.status?.trim() || "Unknown"}
              />
            ) : null}
          </span>
          <span className="project-watchers-kanban-card-title" title={issue.title}>
            {displayTitle}
          </span>
        </span>
        <span className="project-watchers-kanban-card-meta">
          <span className="project-watchers-kanban-card-meta-pill" title={priorityLabel}>
            {priorityLabel}
          </span>
          {dueLabel ? (
            <span className="project-watchers-kanban-card-meta-pill" title={dueLabel}>
              {dueLabel}
            </span>
          ) : null}
          {estimateLabel ? (
            <span className="project-watchers-kanban-card-meta-pill" title={estimateLabel}>
              <span className="project-watchers-kanban-card-meta-pill-icon" aria-hidden="true">
                <LinearIssueEstimateIcon />
              </span>
              <span>{estimateLabel}</span>
            </span>
          ) : null}
          {tags.map((label) => (
            <span
              key={`${issue.id}-${label.name}`}
              className="project-watchers-kanban-card-meta-pill project-watchers-kanban-card-meta-pill--tag"
              title={label.name}
            >
              <span
                className="project-watchers-kanban-card-meta-pill-dot"
                style={{ backgroundColor: label.color }}
                aria-hidden="true"
              />
              <span className="project-watchers-kanban-card-meta-pill-label">
                {label.name}
              </span>
            </span>
          ))}
        </span>
        {createdAtLabel ? (
          <span className="project-watchers-kanban-card-created" title={createdAtLabel}>
            {createdAtLabel}
          </span>
        ) : null}
      </button>
    </li>
  );
}

export function ProjectWatchersKanbanPanel({
  projectId,
  enabled,
}: {
  projectId: string;
  enabled: boolean;
}) {
  const { setActiveLinearIssue } = useContentPanelNavigation();
  const { issues, workflowStates, loading, refreshing, error, refresh } = useLinearProjectIssues(
    projectId,
    enabled,
  );
  const [moveError, setMoveError] = useState<string | null>(null);
  const [draggingIssueId, setDraggingIssueId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const [issueOverrides, setIssueOverrides] = useState<Record<string, BoardIssueOverride>>({});
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const draggingIssueIdRef = useRef<string | null>(null);
  const pointerDragModeRef = useRef(false);
  const pointerOffsetRef = useRef({ x: 0, y: 0 });
  const dragPreviewRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    draggingIssueIdRef.current = draggingIssueId;
  }, [draggingIssueId]);

  useContentPanelBarState({
    error: moveError ?? error,
    loading: loading && issues.length === 0,
    loadingMessage: "Loading issues…",
    refreshing,
    onRefresh: refresh,
  });

  const openLinearIssue = useCallback(
    (issue: LinearIssueEntity, mode: "issue" | "terminal" = "issue") => {
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
    [setActiveLinearIssue],
  );

  useEffect(() => {
    if (!Object.keys(issueOverrides).length) return;
    setIssueOverrides((current) => {
      const issuesById = new Map(issues.map((issue) => [issue.id, issue]));
      let changed = false;
      const next: Record<string, BoardIssueOverride> = {};
      for (const [issueId, override] of Object.entries(current)) {
        const issue = issuesById.get(issueId);
        if (issue?.stateId === override.stateId) {
          changed = true;
          continue;
        }
        next[issueId] = override;
      }
      return changed ? next : current;
    });
  }, [issueOverrides, issues]);

  const effectiveIssues = useMemo(
    () =>
      issues.map((issue) => {
        const override = issueOverrides[issue.id];
        if (!override) return issue;
        return {
          ...issue,
          stateId: override.stateId,
          status: override.status,
          stateType: override.stateType,
          statusColor: override.statusColor,
        };
      }),
    [issueOverrides, issues],
  );

  const workflowStateByCanonical = useMemo(() => {
    const map = new Map<string, { id: string; name: string; type: string; color?: string }>();
    for (const state of workflowStates) {
      const key = canonicalStatusKey(state.name);
      if (!map.has(key)) {
        map.set(key, state);
      }
    }
    return map;
  }, [workflowStates]);

  const columnTargetStateByKey = useMemo(() => {
    const map = new Map<string, { id: string; name: string; type: string; color?: string }>();
    for (const column of BOARD_STATUS_COLUMNS) {
      const resolved = resolveWorkflowStateForColumn(column, workflowStates);
      if (resolved) {
        map.set(column.key, resolved);
      }
    }
    return map;
  }, [workflowStates]);

  const groups = useMemo<WatchersBoardGroup[]>(() => {
    const grouped = groupLinearIssuesByStatus(effectiveIssues);
    const groupedByCanonical = new Map(
      grouped.map((group) => [canonicalStatusKey(group.status), group]),
    );
    const consumedKeys = new Set<string>();

    const baseColumns: WatchersBoardGroup[] = BOARD_STATUS_COLUMNS.map((column) => {
      const existing = groupedByCanonical.get(column.key);
      const state = columnTargetStateByKey.get(column.key) ?? workflowStateByCanonical.get(column.key);
      if (existing) {
        consumedKeys.add(column.key);
        return {
          ...existing,
          canonicalKey: column.key,
          displayStatus: existing.status,
          stateId: existing.issues[0]?.stateId ?? state?.id ?? null,
        };
      }
      return {
        canonicalKey: column.key,
        status: column.label,
        displayStatus: column.label,
        stateId: state?.id ?? null,
        stateType: state?.type ?? column.stateType,
        statusColor: state?.color,
        issues: [],
      };
    });

    const customColumns = grouped
      .filter((group) => !consumedKeys.has(canonicalStatusKey(group.status)))
      .map((group) => ({
        ...group,
        canonicalKey: canonicalStatusKey(group.status),
        displayStatus: group.status,
        stateId:
          group.issues[0]?.stateId ??
          workflowStateByCanonical.get(canonicalStatusKey(group.status))?.id ??
          null,
      }));

    return [...baseColumns, ...customColumns];
  }, [columnTargetStateByKey, effectiveIssues, workflowStateByCanonical]);

  const handlePointerDragStart = useCallback(
    (issue: LinearIssueEntity, event: MouseEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      const rect = event.currentTarget.getBoundingClientRect();
      pointerOffsetRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      pointerDragModeRef.current = true;
      setDraggingIssueId(issue.id);
      setDropIndicator(null);
      setMoveError(null);
      setDragPreview({ issue, width: rect.width, x: rect.left, y: rect.top });
    },
    [],
  );

  const handleColumnDragOver = useCallback(
    (group: WatchersBoardGroup, event: DragEvent<HTMLElement>) => {
      if (!draggingIssueId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const draggedIssue = effectiveIssues.find((issue) => issue.id === draggingIssueId);
      if (!draggedIssue) return;
      const indicator = computeDropIndicator(group, draggedIssue);
      setDropIndicator((current) => {
        if (!indicator && !current) return current;
        if (!indicator) return null;
        if (
          current?.stateId === indicator.stateId &&
          current.beforeIssueId === indicator.beforeIssueId
        ) {
          return current;
        }
        return indicator;
      });
    },
    [draggingIssueId, effectiveIssues],
  );

  const handlePointerColumnEnter = useCallback(
    (group: WatchersBoardGroup) => {
      if (!pointerDragModeRef.current) return;
      const pointerIssueId = draggingIssueIdRef.current;
      if (!pointerIssueId) return;
      const draggedIssue = effectiveIssues.find((issue) => issue.id === pointerIssueId);
      if (!draggedIssue) return;
      const indicator = computeDropIndicator(group, draggedIssue);
      setDropIndicator(indicator);
    },
    [effectiveIssues],
  );

  const handleColumnDrop = useCallback(
    async (group: WatchersBoardGroup, event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      setDropIndicator(null);

      const droppedIssueId = event.dataTransfer.getData("text/plain").trim() || draggingIssueId;
      if (!droppedIssueId) return;

      const issue = effectiveIssues.find((entry) => entry.id === droppedIssueId);
      if (!issue) return;

      const sourceStateId = issue.stateId?.trim() || "";
      let targetStateId = group.stateId?.trim() || "";
      const sourceStatusKey = canonicalStatusKey(issue.status ?? "");
      const needsDetailFallback =
        !targetStateId ||
        (sourceStateId.length > 0 &&
          sourceStateId === targetStateId &&
          sourceStatusKey !== group.canonicalKey);

      if (needsDetailFallback) {
        try {
          const detailResponse = await fetchLinearIssueDetail(droppedIssueId);
          const detailStates = detailResponse.issue?.workflowStates ?? [];
          const resolvedState = resolveWorkflowStateFromList(
            detailStates,
            group.canonicalKey,
            group.stateType,
          );
          if (resolvedState?.id) {
            targetStateId = resolvedState.id;
          }
        } catch {
          // Fallback to existing mapping below.
        }
      }

      if (!targetStateId) {
        setMoveError("Could not resolve a workflow state for this column.");
        setDraggingIssueId(null);
        return;
      }

      if (sourceStateId.length > 0 && sourceStateId === targetStateId) {
        setDraggingIssueId(null);
        return;
      }

      const nextOverride: BoardIssueOverride = {
        stateId: targetStateId,
        status: group.displayStatus,
        stateType: group.stateType,
        statusColor: group.statusColor,
      };
      setIssueOverrides((current) => ({ ...current, [droppedIssueId]: nextOverride }));
      setMoveError(null);

      try {
        const result = await updateLinearIssueDetail(droppedIssueId, { stateId: targetStateId });
        if (result.error) {
          throw new Error(result.error);
        }
      } catch (moveIssueError) {
        setIssueOverrides((current) => {
          const next = { ...current };
          delete next[droppedIssueId];
          return next;
        });
        setMoveError(
          moveIssueError instanceof Error ? moveIssueError.message : "Failed to move issue",
        );
        setDraggingIssueId(null);
        return;
      }

      try {
        await refresh();
      } catch {
        // Keep the optimistic card move; background polling/next refresh will reconcile.
      } finally {
        setDraggingIssueId(null);
      }
    },
    [draggingIssueId, effectiveIssues, refresh],
  );

  useEffect(() => {
    const handleWindowMouseUp = () => {
      if (!pointerDragModeRef.current) return;
      pointerDragModeRef.current = false;
      setDraggingIssueId(null);
      setDropIndicator(null);
    };
    const handleWindowMouseMove = (event: globalThis.MouseEvent) => {
      if (!pointerDragModeRef.current) return;
      const node = dragPreviewRef.current;
      if (!node) return;
      const x = event.clientX - pointerOffsetRef.current.x;
      const y = event.clientY - pointerOffsetRef.current.y;
      node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    window.addEventListener("mouseup", handleWindowMouseUp);
    window.addEventListener("mousemove", handleWindowMouseMove);
    return () => {
      window.removeEventListener("mouseup", handleWindowMouseUp);
      window.removeEventListener("mousemove", handleWindowMouseMove);
    };
  }, []);

  useEffect(() => {
    if (draggingIssueId === null) {
      setDragPreview(null);
    }
  }, [draggingIssueId]);

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

  return (
    <div className="project-watchers-kanban-scroll">
      {dragPreview
        ? createPortal(
            <ul
              ref={dragPreviewRef}
              className="project-watchers-kanban-card-drag-preview"
              style={{
                width: `${dragPreview.width}px`,
                transform: `translate3d(${dragPreview.x}px, ${dragPreview.y}px, 0)`,
              }}
              aria-hidden="true"
            >
              <ProjectWatchersIssueCard
                issue={dragPreview.issue}
                onOpen={() => {}}
                onOpenTerminal={() => {}}
                onPointerDragStart={() => {}}
                dragging={false}
              />
            </ul>,
            document.body,
          )
        : null}
      <div className="project-watchers-kanban" aria-label="Issue board by status">
        {groups.map((group, index) => (
          <section
            key={`${group.displayStatus}-${group.stateType ?? "none"}-${index}`}
            className={[
              "project-watchers-kanban-column",
              group.issues.length === 0 ? "project-watchers-kanban-column--collapsed" : null,
              dropIndicator?.stateId && group.stateId === dropIndicator.stateId
                ? "project-watchers-kanban-column--drop-target"
                : null,
            ]
              .filter(Boolean)
              .join(" ")}
            onDragOver={(event) => {
              handleColumnDragOver(group, event);
            }}
            onDrop={(event) => {
              void handleColumnDrop(group, event);
            }}
            onMouseEnter={() => {
              handlePointerColumnEnter(group);
            }}
            onMouseUp={() => {
              if (!pointerDragModeRef.current) return;
              pointerDragModeRef.current = false;
              const pointerIssueId = draggingIssueIdRef.current;
              if (!pointerIssueId) return;
              const syntheticEvent = {
                preventDefault: () => {},
                dataTransfer: {
                  getData: () => pointerIssueId,
                },
              } as unknown as DragEvent<HTMLElement>;
              void handleColumnDrop(group, syntheticEvent);
            }}
          >
            <header className="project-watchers-kanban-column-header">
              <span className="project-watchers-kanban-column-title">
                <LinearStatusIcon
                  status={group.displayStatus}
                  stateType={group.stateType}
                  title={group.displayStatus}
                />
                <span>{group.displayStatus}</span>
              </span>
              <span className="project-watchers-kanban-column-count">{group.issues.length}</span>
            </header>
            {dropIndicator?.stateId === group.stateId && group.issues.length > 0 ? (
              <div className="project-watchers-kanban-column-drop-overlay" aria-hidden="true" />
            ) : null}
            {group.issues.length > 0 ? (
              <ol className="project-watchers-kanban-column-list">
                {!draggingIssueId && group.issues.length >= 40 ? (
                  <VirtualList
                    items={group.issues}
                    estimateSize={120}
                    overscan={4}
                    getItemKey={(issue) => issue.id}
                    renderItem={(issue) => (
                      <ProjectWatchersIssueCard
                        issue={issue}
                        onOpen={(selectedIssue) => {
                          openLinearIssue(selectedIssue);
                        }}
                        onOpenTerminal={(selectedIssue) => {
                          openLinearIssue(selectedIssue, "terminal");
                        }}
                        onPointerDragStart={handlePointerDragStart}
                        dragging={draggingIssueId === issue.id}
                      />
                    )}
                  />
                ) : (
                  group.issues.map((issue) => (
                  <Fragment key={issue.id}>
                    {dropIndicator?.stateId === group.stateId &&
                    dropIndicator.beforeIssueId === issue.id ? (
                      <li className="project-watchers-kanban-drop-divider" aria-hidden="true" />
                    ) : null}
                    <ProjectWatchersIssueCard
                      issue={issue}
                      onOpen={(selectedIssue) => {
                        openLinearIssue(selectedIssue);
                      }}
                      onOpenTerminal={(selectedIssue) => {
                        openLinearIssue(selectedIssue, "terminal");
                      }}
                      onPointerDragStart={handlePointerDragStart}
                      dragging={draggingIssueId === issue.id}
                    />
                  </Fragment>
                  ))
                )}
                {dropIndicator?.stateId === group.stateId && dropIndicator.beforeIssueId === null ? (
                  <li className="project-watchers-kanban-drop-divider" aria-hidden="true" />
                ) : null}
              </ol>
            ) : dropIndicator?.stateId === group.stateId ? (
              <div className="project-watchers-kanban-column-empty-drop">
                <span className="project-watchers-kanban-drop-divider" aria-hidden="true" />
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
