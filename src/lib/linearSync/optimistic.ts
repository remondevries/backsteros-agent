import type { LinearIssueEntity } from "../../chat/types";
import type { LinearIssueDetail, LinearIssueDetailUpdates } from "../api";
import type { ProjectDocumentEntity } from "../documentStatusGroups";
import {
  applyPendingDraftUpdatesToDetailLocal,
} from "../inboxDraftIssue";
import {
  clearPendingIssueUpdates,
} from "./pendingCache";
import { notifyLinearDocumentListChange, type LinearDocumentListPatch } from "../linearDocumentListEvents";
import { notifyLinearIssueListChange } from "../linearIssueListEvents";
import {
  linearIssueDetailToListPatch,
} from "../linearIssueListPatch";
import {
  clearLinearIssueDetailSeed,
  migrateLinearIssueDetailSeed,
  seedLinearIssueDetailFromEntity,
} from "../linearIssueDetailSeed";
import {
  clearLinearDocumentContentSeed,
  migrateLinearDocumentContentSeed,
  seedLinearDocumentContentFromEntity,
} from "../linearDocumentContentSeed";
import type { StoredMutation } from "./types";
import { isDraftDocumentId } from "./types";

function issueEntityFromDetail(issue: LinearIssueDetail): LinearIssueEntity {
  return {
    id: issue.id,
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
    projectId: issue.projectId ?? undefined,
    projectName: issue.projectName ?? undefined,
    labels: issue.labels.map((label) => ({ name: label.name, color: label.color })),
  };
}

export function applyOptimisticMutation(mutation: StoredMutation): void {
  const payload = mutation.payload;

  switch (payload.type) {
    case "issue.create": {
      const localIssue = payload.payload.localIssue;
      seedLinearIssueDetailFromEntity(localIssue, { freshCreate: true });
      notifyLinearIssueListChange({ type: "prepend", issue: localIssue });
      return;
    }
    case "issue.update": {
      const { issueId, updates } = payload.payload;
      notifyLinearIssueListChange({
        type: "update",
        issueId,
        patch: linearIssueDetailUpdatesToListPatch(updates),
      });
      return;
    }
    case "issue.delete": {
      notifyLinearIssueListChange({ type: "remove", issueId: payload.payload.issueId });
      return;
    }
    case "document.create": {
      const localDocument = payload.payload.localDocument;
      seedLinearDocumentContentFromEntity(localDocument);
      notifyLinearDocumentListChange({ type: "prepend", document: localDocument });
      return;
    }
    case "document.update": {
      const { documentId, updates } = payload.payload;
      const patch: LinearDocumentListPatch = {
        updatedAt: new Date().toISOString(),
      };
      if (updates.title !== undefined) patch.title = updates.title;
      if (updates.issueId !== undefined) {
        patch.linkedIssueId = updates.issueId ?? undefined;
      }
      if (updates.projectId !== undefined) {
        patch.projectId = updates.projectId ?? undefined;
        patch.projectName = undefined;
      }
      if (updates.teamId !== undefined) {
        patch.organization = undefined;
      }
      notifyLinearDocumentListChange({
        type: "update",
        linearDocumentId: documentId,
        patch,
      });
      return;
    }
    case "document.delete": {
      notifyLinearDocumentListChange({
        type: "remove",
        linearDocumentId: payload.payload.documentId,
      });
      return;
    }
    case "letter.upload":
      return;
    default:
      return;
  }
}

export function applyOptimisticIssueDetailLocal(
  detail: LinearIssueDetail,
  updates: LinearIssueDetailUpdates,
): LinearIssueDetail {
  return applyPendingDraftUpdatesToDetailLocal(detail, updates);
}

export function reconcileIssueCreateSuccess(
  localIssue: LinearIssueEntity,
  remoteIssue: LinearIssueEntity,
): LinearIssueEntity {
  migrateLinearIssueDetailSeed(localIssue.id, remoteIssue, { freshCreate: false });
  notifyLinearIssueListChange({
    type: "replace",
    previousId: localIssue.id,
    issue: remoteIssue,
  });
  return remoteIssue;
}

export function reconcileIssueUpdateSuccess(localIssueId: string, issue: LinearIssueDetail): void {
  const patch = linearIssueDetailToListPatch(issue);
  notifyLinearIssueListChange({
    type: "update",
    issueId: localIssueId,
    patch,
  });
  if (issue.id !== localIssueId) {
    notifyLinearIssueListChange({
      type: "update",
      issueId: issue.id,
      patch,
    });
  }
}

export function reconcileDocumentCreateSuccess(
  localDocument: ProjectDocumentEntity,
  remoteDocument: ProjectDocumentEntity,
  content?: string,
): void {
  if (isDraftDocumentId(localDocument.linearDocumentId)) {
    migrateLinearDocumentContentSeed(localDocument.linearDocumentId, remoteDocument, {
      content,
    });
  }
  seedLinearDocumentContentFromEntity(remoteDocument, { content });
  notifyLinearDocumentListChange({
    type: "replace",
    previousId: localDocument.linearDocumentId,
    document: remoteDocument,
  });
}

export function reconcileDocumentUpdateSuccess(
  localDocumentId: string,
  resolvedDocumentId: string,
  document: {
    title: string;
    updatedAt: string;
    linkedIssueId?: string;
    linkedIssueIdentifier?: string;
    projectId?: string;
    projectName?: string;
    teamName?: string;
  },
): void {
  const patch: LinearDocumentListPatch = {
    title: document.title,
    updatedAt: document.updatedAt,
    linkedIssueId: document.linkedIssueId,
    linkedIssueIdentifier: document.linkedIssueIdentifier,
    projectId: document.projectId,
    projectName: document.projectName,
    organization: document.teamName?.trim() || undefined,
  };

  notifyLinearDocumentListChange({
    type: "update",
    linearDocumentId: localDocumentId,
    patch,
  });

  if (resolvedDocumentId !== localDocumentId) {
    notifyLinearDocumentListChange({
      type: "update",
      linearDocumentId: resolvedDocumentId,
      patch,
    });
  }
}

export function rollbackOptimisticIssueCreate(issueId: string): void {
  const id = issueId.trim();
  if (!id) return;
  clearLinearIssueDetailSeed(id);
  clearPendingIssueUpdates(id);
  notifyLinearIssueListChange({ type: "remove", issueId: id });
}

export function rollbackOptimisticDocumentCreate(documentId: string): void {
  const id = documentId.trim();
  if (!id) return;
  clearLinearDocumentContentSeed(id);
  notifyLinearDocumentListChange({ type: "remove", linearDocumentId: id });
}

export function reconcileLetterUploadSuccess(
  document: ProjectDocumentEntity,
  issue: LinearIssueEntity,
  content?: string,
): void {
  seedLinearIssueDetailFromEntity(issue);
  seedLinearDocumentContentFromEntity(document, { content });
  notifyLinearDocumentListChange({ type: "refresh" });
  notifyLinearIssueListChange({ type: "refresh" });
}

function linearIssueDetailUpdatesToListPatch(
  updates: LinearIssueDetailUpdates,
): ReturnType<typeof linearIssueDetailToListPatch> {
  const patch: ReturnType<typeof linearIssueDetailToListPatch> = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.stateId !== undefined) patch.stateId = updates.stateId;
  if (updates.priority !== undefined) patch.priority = updates.priority;
  if (updates.assigneeId !== undefined) patch.assigneeId = updates.assigneeId ?? undefined;
  if (updates.dueDate !== undefined) patch.dueDate = updates.dueDate ?? undefined;
  if (updates.estimate !== undefined) patch.estimate = updates.estimate;
  if (updates.labelIds !== undefined) {
    patch.labels = updates.labelIds.map((id) => ({ name: id, color: "#888888" }));
  }
  return patch;
}

export function issueEntityFromLinearIssueDetail(issue: LinearIssueDetail): LinearIssueEntity {
  return issueEntityFromDetail(issue);
}
