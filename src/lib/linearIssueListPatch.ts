import type { LinearIssueListPatch } from "./linearIssueListEvents";
import { notifyLinearIssueListChange } from "./linearIssueListEvents";
import type { LinearIssueDetail } from "./api";

export function linearIssueDetailToListPatch(issue: LinearIssueDetail): LinearIssueListPatch {
  return {
    identifier: issue.identifier,
    title: issue.title,
    status: issue.status,
    stateId: issue.stateId,
    stateType: issue.stateType,
    statusColor: issue.statusColor,
    priority: issue.priority,
    priorityLabel: issue.priorityLabel,
    assigneeId: issue.assigneeId ?? undefined,
    assigneeName: issue.assigneeName ?? undefined,
    assigneeAvatarUrl: issue.assigneeAvatarUrl ?? undefined,
    dueDate: issue.dueDate ?? undefined,
    estimate: issue.estimate,
    labels: issue.labels.map((label) => ({ name: label.name, color: label.color })),
  };
}

export function notifyLinearIssueListUpdateFromDetail(issue: LinearIssueDetail): void {
  notifyLinearIssueListChange({
    type: "update",
    issueId: issue.id,
    patch: linearIssueDetailToListPatch(issue),
  });
}
