import type { LinearIssueEntity } from "../chat/types";

export type LinearIssueListPatch = Partial<
  Pick<
    LinearIssueEntity,
    | "identifier"
    | "title"
    | "status"
    | "stateId"
    | "stateType"
    | "statusColor"
    | "priority"
    | "priorityLabel"
    | "assigneeId"
    | "assigneeName"
    | "assigneeAvatarUrl"
    | "dueDate"
    | "estimate"
    | "labels"
    | "updatedAt"
  >
>;

export type LinearIssueListChange =
  | { type: "update"; issueId: string; patch: LinearIssueListPatch }
  | { type: "remove"; issueId: string };

type LinearIssueListChangeListener = (change: LinearIssueListChange) => void;

const listeners = new Set<LinearIssueListChangeListener>();

export function onLinearIssueListChange(listener: LinearIssueListChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyLinearIssueListChange(change: LinearIssueListChange): void {
  for (const listener of listeners) {
    listener(change);
  }
}
