import type { LinearIssueEntity } from "../chat/types";

export type IssueStatusOverride = {
  stateId: string;
  status: string;
  stateType?: string;
  statusColor?: string;
};

export type StatusMoveDropIndicator = {
  stateId: string;
  beforeIssueId: string | null;
};

export type StatusMoveTargetGroup = {
  canonicalKey: string;
  displayStatus: string;
  stateId: string | null;
  stateType?: string;
  statusColor?: string;
  issues: LinearIssueEntity[];
};

export type LinearWorkflowStateSummary = {
  id: string;
  name: string;
  type: string;
  color?: string;
};

export function canonicalStatusKey(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "completed") return "done";
  if (normalized === "cancelled") return "canceled";
  if (normalized === "duplicate") return "duplicated";
  return normalized;
}

export function compareIssuesForStatusOrdering(
  left: LinearIssueEntity,
  right: LinearIssueEntity,
): number {
  const leftPriority = left.priority ?? 99;
  const rightPriority = right.priority ?? 99;
  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }
  const leftLabel = left.identifier ?? left.title;
  const rightLabel = right.identifier ?? right.title;
  return leftLabel.localeCompare(rightLabel);
}

export function resolveWorkflowStateFromList(
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

export function computeStatusMoveDropIndicator(
  group: StatusMoveTargetGroup,
  draggedIssue: LinearIssueEntity,
): StatusMoveDropIndicator | null {
  const stateId = group.stateId?.trim();
  if (!stateId) return null;
  if (draggedIssue.stateId?.trim() === stateId) return null;

  const targetIssues = group.issues.filter((issue) => issue.id !== draggedIssue.id);
  let insertionIndex = targetIssues.length;
  for (let index = 0; index < targetIssues.length; index += 1) {
    if (compareIssuesForStatusOrdering(draggedIssue, targetIssues[index]!) < 0) {
      insertionIndex = index;
      break;
    }
  }

  return {
    stateId,
    beforeIssueId: targetIssues[insertionIndex]?.id ?? null,
  };
}

export function applyIssueStatusOverrides(
  issues: LinearIssueEntity[],
  issueOverrides: Record<string, IssueStatusOverride>,
): LinearIssueEntity[] {
  return issues.map((issue) => {
    const override = issueOverrides[issue.id];
    if (!override) return issue;
    return {
      ...issue,
      stateId: override.stateId,
      status: override.status,
      stateType: override.stateType,
      statusColor: override.statusColor,
    };
  });
}

export function reconcileIssueStatusOverrides(
  issues: LinearIssueEntity[],
  issueOverrides: Record<string, IssueStatusOverride>,
): Record<string, IssueStatusOverride> {
  const issuesById = new Map(issues.map((issue) => [issue.id, issue]));
  let changed = false;
  const next: Record<string, IssueStatusOverride> = {};
  for (const [issueId, override] of Object.entries(issueOverrides)) {
    const issue = issuesById.get(issueId);
    if (issue?.stateId === override.stateId) {
      changed = true;
      continue;
    }
    next[issueId] = override;
  }
  return changed ? next : issueOverrides;
}

export function buildWorkflowStateByCanonical(
  workflowStates: LinearWorkflowStateSummary[],
): Map<string, LinearWorkflowStateSummary> {
  const map = new Map<string, LinearWorkflowStateSummary>();
  for (const state of workflowStates) {
    const key = canonicalStatusKey(state.name);
    if (!map.has(key)) {
      map.set(key, state);
    }
  }
  return map;
}

export function toStatusMoveTargetGroup(input: {
  status: string;
  displayStatus?: string;
  stateId?: string | null;
  stateType?: string;
  statusColor?: string;
  issues: LinearIssueEntity[];
  workflowStateByCanonical?: Map<string, LinearWorkflowStateSummary>;
}): StatusMoveTargetGroup {
  const canonicalKey = canonicalStatusKey(input.status);
  const workflowState = input.workflowStateByCanonical?.get(canonicalKey);
  return {
    canonicalKey,
    displayStatus: input.displayStatus ?? input.status,
    stateId:
      input.stateId ??
      input.issues[0]?.stateId ??
      workflowState?.id ??
      null,
    stateType: input.stateType ?? workflowState?.type,
    statusColor: input.statusColor ?? workflowState?.color,
    issues: input.issues,
  };
}
