import type { LinearIssueDetail, LinearIssueDetailUpdates } from "./api";
import { peekPendingIssueUpdates, clearPendingIssueUpdates } from "./linearSync/pendingCache";
import { linearSync } from "./linearSync";

export const INBOX_DRAFT_ISSUE_ID_PREFIX = "draft-inbox:";
export const LETTER_DRAFT_ISSUE_ID_PREFIX = "draft-letter:";

export function isInboxDraftIssueId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith(INBOX_DRAFT_ISSUE_ID_PREFIX);
}

export function isLetterDraftIssueId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith(LETTER_DRAFT_ISSUE_ID_PREFIX);
}

export function isDraftIssueId(id: string | null | undefined): boolean {
  return isInboxDraftIssueId(id) || isLetterDraftIssueId(id);
}

export function createInboxDraftIssue(): import("../chat/types").LinearIssueEntity {
  return {
    id: `${INBOX_DRAFT_ISSUE_ID_PREFIX}${crypto.randomUUID()}`,
    title: "Untitled",
  };
}

export function createLetterDraftIssue(title = "Untitled"): import("../chat/types").LinearIssueEntity {
  return {
    id: `${LETTER_DRAFT_ISSUE_ID_PREFIX}${crypto.randomUUID()}`,
    title: title.trim() || "Untitled",
  };
}

function resolveLinearIssueIdentifier(issue: { identifier?: string | null }): string | null {
  const identifier = issue.identifier?.trim();
  if (!identifier || isInboxDraftIssueId(identifier)) return null;
  return identifier;
}

export function formatLinearIssueBreadcrumbLabel(
  issue: { identifier?: string; title: string },
  options?: { hideIdentifier?: boolean },
): string {
  if (options?.hideIdentifier) {
    return issue.title;
  }

  const identifier = resolveLinearIssueIdentifier(issue);
  return identifier ? `${identifier} ${issue.title}` : issue.title;
}

export function resolveLinearIssueTabLabel(
  issue: { identifier?: string; title: string },
  options?: { hideIdentifier?: boolean },
): string {
  if (options?.hideIdentifier) {
    return issue.title;
  }

  return resolveLinearIssueIdentifier(issue) ?? issue.title;
}

export function queueInboxDraftIssueUpdates(
  draftId: string,
  updates: LinearIssueDetailUpdates,
): void {
  const id = draftId.trim();
  if (!isDraftIssueId(id)) return;
  void linearSync.enqueueIssueUpdate(id, updates);
}

export function peekDraftIssueUpdates(draftId: string): LinearIssueDetailUpdates | null {
  return peekPendingIssueUpdates(draftId.trim());
}

export function clearInboxDraftIssueUpdates(draftId: string): void {
  clearPendingIssueUpdates(draftId.trim());
}

function applyLinearIssueDetailUpdates(
  issue: LinearIssueDetail,
  updates: LinearIssueDetailUpdates,
): LinearIssueDetail {
  return {
    ...issue,
    ...(updates.title !== undefined ? { title: updates.title } : null),
    ...(updates.description !== undefined ? { description: updates.description } : null),
    ...(updates.stateId !== undefined ? { stateId: updates.stateId } : null),
    ...(updates.priority !== undefined ? { priority: updates.priority } : null),
    ...(updates.assigneeId !== undefined ? { assigneeId: updates.assigneeId } : null),
    ...(updates.dueDate !== undefined ? { dueDate: updates.dueDate } : null),
    ...(updates.estimate !== undefined ? { estimate: updates.estimate } : null),
    ...(updates.teamId !== undefined ? { teamId: updates.teamId } : null),
    ...(updates.projectId !== undefined ? { projectId: updates.projectId } : null),
    ...(updates.labelIds !== undefined
      ? {
          labels: updates.labelIds.map((labelId, index) => ({
            id: labelId,
            name: issue.labels[index]?.name ?? labelId,
            color: issue.labels[index]?.color ?? "#888888",
          })),
        }
      : null),
  };
}

export function applyPendingDraftUpdatesToDetail(
  draftId: string,
  detail: LinearIssueDetail,
): LinearIssueDetail {
  const updates = peekPendingIssueUpdates(draftId.trim());
  if (!updates) return detail;
  return applyLinearIssueDetailUpdates(detail, updates);
}

export function applyPendingDraftUpdatesToEntity(
  draftId: string,
  entity: import("../chat/types").LinearIssueEntity,
): import("../chat/types").LinearIssueEntity {
  const updates = peekPendingIssueUpdates(draftId.trim());
  if (!updates) return entity;
  return {
    ...entity,
    ...(updates.title !== undefined ? { title: updates.title } : null),
  };
}

export function applyPendingDraftUpdatesToDetailLocal(
  detail: LinearIssueDetail,
  updates: LinearIssueDetailUpdates,
): LinearIssueDetail {
  return applyLinearIssueDetailUpdates(detail, updates);
}
