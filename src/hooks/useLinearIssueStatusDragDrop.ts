import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
} from "react";
import type { LinearIssueEntity } from "../chat/types";
import { fetchLinearIssueDetail, updateLinearIssueDetail } from "../lib/api";
import {
  applyIssueStatusOverrides,
  canonicalStatusKey,
  computeStatusMoveDropIndicator,
  reconcileIssueStatusOverrides,
  resolveWorkflowStateFromList,
  type IssueStatusOverride,
  type StatusMoveDropIndicator,
  type StatusMoveTargetGroup,
} from "../lib/linearIssueStatusMove";

export function useLinearIssueStatusDragDrop({
  issues,
  refresh,
}: {
  issues: LinearIssueEntity[];
  refresh: () => Promise<void>;
}) {
  const [moveError, setMoveError] = useState<string | null>(null);
  const [draggingIssueId, setDraggingIssueId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<StatusMoveDropIndicator | null>(null);
  const [issueOverrides, setIssueOverrides] = useState<Record<string, IssueStatusOverride>>({});
  const draggingIssueIdRef = useRef<string | null>(null);
  const pointerDragModeRef = useRef(false);

  useEffect(() => {
    draggingIssueIdRef.current = draggingIssueId;
  }, [draggingIssueId]);

  useEffect(() => {
    if (!Object.keys(issueOverrides).length) return;
    setIssueOverrides((current) => reconcileIssueStatusOverrides(issues, current));
  }, [issueOverrides, issues]);

  const effectiveIssues = useMemo(
    () => applyIssueStatusOverrides(issues, issueOverrides),
    [issueOverrides, issues],
  );

  const handlePointerDragStart = useCallback(
    (issue: LinearIssueEntity, event: MouseEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      pointerDragModeRef.current = true;
      setDraggingIssueId(issue.id);
      setDropIndicator(null);
      setMoveError(null);
    },
    [],
  );

  const updateDropIndicator = useCallback(
    (group: StatusMoveTargetGroup) => {
      const activeIssueId = draggingIssueIdRef.current;
      if (!activeIssueId) return;
      const draggedIssue = effectiveIssues.find((issue) => issue.id === activeIssueId);
      if (!draggedIssue) return;
      const indicator = computeStatusMoveDropIndicator(group, draggedIssue);
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
    [effectiveIssues],
  );

  const handleGroupDragOver = useCallback(
    (group: StatusMoveTargetGroup, event: DragEvent<HTMLElement>) => {
      if (!draggingIssueId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      updateDropIndicator(group);
    },
    [draggingIssueId, updateDropIndicator],
  );

  const handlePointerGroupEnter = useCallback(
    (group: StatusMoveTargetGroup) => {
      if (!pointerDragModeRef.current) return;
      updateDropIndicator(group);
    },
    [updateDropIndicator],
  );

  const handleGroupDrop = useCallback(
    async (group: StatusMoveTargetGroup, event: DragEvent<HTMLElement>) => {
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
        setMoveError("Could not resolve a workflow state for this group.");
        setDraggingIssueId(null);
        pointerDragModeRef.current = false;
        return;
      }

      if (sourceStateId.length > 0 && sourceStateId === targetStateId) {
        setDraggingIssueId(null);
        pointerDragModeRef.current = false;
        return;
      }

      const nextOverride: IssueStatusOverride = {
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
        pointerDragModeRef.current = false;
        return;
      }

      try {
        await refresh();
      } catch {
        // Keep optimistic move; next refresh will reconcile.
      } finally {
        setDraggingIssueId(null);
        pointerDragModeRef.current = false;
      }
    },
    [draggingIssueId, effectiveIssues, refresh],
  );

  const handleGroupMouseUp = useCallback(
    (group: StatusMoveTargetGroup) => {
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
      void handleGroupDrop(group, syntheticEvent);
    },
    [handleGroupDrop],
  );

  useEffect(() => {
    const handleWindowMouseUp = () => {
      if (!pointerDragModeRef.current) return;
      pointerDragModeRef.current = false;
      setDraggingIssueId(null);
      setDropIndicator(null);
    };
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, []);

  return {
    effectiveIssues,
    moveError,
    draggingIssueId,
    dropIndicator,
    handlePointerDragStart,
    handleGroupDragOver,
    handlePointerGroupEnter,
    handleGroupDrop,
    handleGroupMouseUp,
  };
}
