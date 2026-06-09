import { resolveLinearStatusKey } from "../chat/LinearStatusIcon";
import type { LinearIssueEntity } from "../chat/types";

export interface LinearStatusGroup {
  status: string;
  stateType?: string;
  statusColor?: string;
  issues: LinearIssueEntity[];
}

const STATE_TYPE_ORDER: Record<string, number> = {
  triage: 0,
  backlog: 1,
  unstarted: 2,
  started: 3,
  completed: 4,
  canceled: 5,
  cancelled: 5,
};

function groupSortKey(group: LinearStatusGroup): number {
  const sample = group.issues[0];
  const iconKey = resolveLinearStatusKey(sample?.status, sample?.stateType);
  if (iconKey === "on_hold") return 3.2;
  if (iconKey === "in_review") return 3.5;

  const stateType = sample?.stateType?.trim().toLowerCase() ?? "";
  if (stateType in STATE_TYPE_ORDER) {
    return STATE_TYPE_ORDER[stateType]!;
  }

  return 2.5;
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
      stateType: sample?.stateType,
      statusColor: sample?.statusColor,
      issues: sortedIssues,
    };
  });

  return groups.sort((left, right) => {
    const orderDiff = groupSortKey(left) - groupSortKey(right);
    if (orderDiff !== 0) {
      return orderDiff;
    }
    return left.status.localeCompare(right.status);
  });
}
