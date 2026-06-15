import {
  resolveLinearStatusKey,
  type LinearWorkflowStateForIcon,
} from "../lib/linearStatusIcon";
import type { LinearIssueEntity } from "../chat/types";
import { statusOrderIndex } from "../lib/linearIssueDisplay";

export interface LinearStatusGroup {
  status: string;
  stateId?: string | null;
  stateType?: string;
  statusColor?: string;
  issues: LinearIssueEntity[];
}

const LINEAR_WORKFLOW_TYPE_ORDER: Record<string, number> = {
  started: 0,
  unstarted: 1,
  backlog: 2,
  triage: 3,
  completed: 4,
  canceled: 5,
  cancelled: 5,
  duplicate: 6,
  duplicated: 6,
};

function workflowTypeSortKey(stateType?: string): number {
  const normalized = normalizeWorkflowStateType(stateType);
  if (normalized in LINEAR_WORKFLOW_TYPE_ORDER) {
    return LINEAR_WORKFLOW_TYPE_ORDER[normalized]!;
  }
  return 1.5;
}

function normalizeWorkflowStateType(stateType?: string): string {
  return stateType?.trim().toLowerCase() ?? "";
}

function compareWorkflowStatesForDisplay(
  left: LinearWorkflowStateForIcon,
  right: LinearWorkflowStateForIcon,
): number {
  const typeDiff = workflowTypeSortKey(left.type) - workflowTypeSortKey(right.type);
  if (typeDiff !== 0) return typeDiff;

  const leftPosition = Number.isFinite(left.position) ? Number(left.position) : Number.NaN;
  const rightPosition = Number.isFinite(right.position) ? Number(right.position) : Number.NaN;
  if (Number.isFinite(leftPosition) && Number.isFinite(rightPosition) && leftPosition !== rightPosition) {
    const positionDiff = leftPosition - rightPosition;
    const bothStarted =
      normalizeWorkflowStateType(left.type) === "started" &&
      normalizeWorkflowStateType(right.type) === "started";
    return bothStarted ? -positionDiff : positionDiff;
  }
  if (Number.isFinite(leftPosition) && !Number.isFinite(rightPosition)) return -1;
  if (!Number.isFinite(leftPosition) && Number.isFinite(rightPosition)) return 1;
  return left.name.localeCompare(right.name);
}

function sortWorkflowStatesForDisplay(
  states: LinearWorkflowStateForIcon[],
): LinearWorkflowStateForIcon[] {
  return [...states].sort(compareWorkflowStatesForDisplay);
}

function normalizeWorkflowStateName(name?: string): string {
  return name?.trim().toLowerCase() ?? "";
}

/** Multi-team projects can expose several workflow states with the same label. */
function canonicalizeWorkflowStatesForGrouping(
  states: LinearWorkflowStateForIcon[],
): {
  displayStates: LinearWorkflowStateForIcon[];
  resolveState: (state: LinearWorkflowStateForIcon) => LinearWorkflowStateForIcon;
} {
  const sortedStates = sortWorkflowStatesForDisplay(states);
  const displayStates: LinearWorkflowStateForIcon[] = [];
  const canonicalByName = new Map<string, LinearWorkflowStateForIcon>();
  const resolveById = new Map<string, LinearWorkflowStateForIcon>();

  for (const state of sortedStates) {
    const nameKey = normalizeWorkflowStateName(state.name);
    let canonical = nameKey ? canonicalByName.get(nameKey) : undefined;
    if (!canonical) {
      canonical = state;
      if (nameKey) {
        canonicalByName.set(nameKey, canonical);
      }
      displayStates.push(canonical);
    }
    resolveById.set(state.id, canonical);
  }

  return {
    displayStates,
    resolveState: (state) => resolveById.get(state.id) ?? state,
  };
}

function groupSortKey(group: LinearStatusGroup): number {
  const stateType = group.stateType ?? group.issues[0]?.stateType;
  const iconKey = resolveLinearStatusKey(group.status, stateType);
  const typeBase = workflowTypeSortKey(stateType);
  if (iconKey === "in_review") return typeBase + 0.2;
  if (iconKey === "on_hold") return typeBase + 0.5;

  return typeBase;
}

function compareStatusGroups(left: LinearStatusGroup, right: LinearStatusGroup): number {
  const orderDiff = groupSortKey(left) - groupSortKey(right);
  if (orderDiff !== 0) {
    return orderDiff;
  }

  const nameOrderDiff = statusOrderIndex(left.status) - statusOrderIndex(right.status);
  if (nameOrderDiff !== 0) {
    return nameOrderDiff;
  }

  return left.status.localeCompare(right.status);
}

function compareIssues(left: LinearIssueEntity, right: LinearIssueEntity): number {
  const leftPriority = left.priority ?? 99;
  const rightPriority = right.priority ?? 99;
  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  const leftLabel = left.identifier ?? left.title;
  const rightLabel = right.identifier ?? right.title;
  return leftLabel.localeCompare(rightLabel);
}

export function groupLinearIssuesByStatus(issues: LinearIssueEntity[]): LinearStatusGroup[] {
  const byStatus = new Map<string, LinearIssueEntity[]>();

  for (const issue of issues) {
    const status = issue.status?.trim() || "Unknown";
    const existing = byStatus.get(status);
    if (existing) {
      existing.push(issue);
    } else {
      byStatus.set(status, [issue]);
    }
  }

  const groups = [...byStatus.entries()].map(([status, groupIssues]) => {
    const sortedIssues = [...groupIssues].sort(compareIssues);
    const sample = sortedIssues[0];
    return {
      status,
      stateId: sample?.stateId,
      stateType: sample?.stateType,
      statusColor: sample?.statusColor,
      issues: sortedIssues,
    };
  });

  return groups.sort(compareStatusGroups);
}

function assignIssueToWorkflowState(
  issue: LinearIssueEntity,
  workflowStates: LinearWorkflowStateForIcon[],
): LinearWorkflowStateForIcon | null {
  const stateId = issue.stateId?.trim();
  if (stateId) {
    const byId = workflowStates.find((state) => state.id === stateId);
    if (byId) return byId;
  }

  const normalizedStatus = issue.status?.trim().toLowerCase() ?? "";
  if (!normalizedStatus) return null;

  return (
    workflowStates.find((state) => state.name.trim().toLowerCase() === normalizedStatus) ?? null
  );
}

/** Groups issues under every workflow state, including empty columns. */
export function groupLinearIssuesByWorkflow(
  issues: LinearIssueEntity[],
  workflowStates: LinearWorkflowStateForIcon[],
): LinearStatusGroup[] {
  if (workflowStates.length === 0) {
    return groupLinearIssuesByStatus(issues);
  }

  const sortedStates = sortWorkflowStatesForDisplay(workflowStates);
  const { displayStates, resolveState } = canonicalizeWorkflowStatesForGrouping(sortedStates);
  const issuesByStateId = new Map<string, LinearIssueEntity[]>();
  const unmatchedIssues: LinearIssueEntity[] = [];

  for (const issue of issues) {
    const matchedState = assignIssueToWorkflowState(issue, sortedStates);
    if (!matchedState) {
      unmatchedIssues.push(issue);
      continue;
    }

    const canonicalState = resolveState(matchedState);
    const list = issuesByStateId.get(canonicalState.id) ?? [];
    list.push(issue);
    issuesByStateId.set(canonicalState.id, list);
  }

  const workflowGroups: LinearStatusGroup[] = displayStates.map((state) => ({
    status: state.name,
    stateId: state.id,
    stateType: state.type,
    statusColor: state.color,
    issues: [...(issuesByStateId.get(state.id) ?? [])].sort(compareIssues),
  }));

  if (unmatchedIssues.length === 0) {
    return workflowGroups;
  }

  const workflowStatusNames = new Set(
    workflowGroups.map((group) => normalizeWorkflowStateName(group.status)),
  );
  const extraGroups = groupLinearIssuesByStatus(unmatchedIssues).filter(
    (group) => !workflowStatusNames.has(normalizeWorkflowStateName(group.status)),
  );

  return extraGroups.length > 0 ? [...workflowGroups, ...extraGroups] : workflowGroups;
}
