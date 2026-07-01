import type { LinearDocumentContent } from "./api";
import type { LinearDocumentListPatch } from "./linearDocumentListEvents";

export type LinearDocumentContentUpdates = {
  title?: string;
  content?: string;
  body?: string;
  projectId?: string | null;
  projectName?: string | null;
  teamId?: string;
  teamName?: string | null;
  issueId?: string | null;
};

export function applyLinearDocumentContentUpdates(
  document: LinearDocumentContent,
  updates: LinearDocumentContentUpdates,
): LinearDocumentContent {
  const content = updates.content ?? updates.body;
  const next: LinearDocumentContent = {
    ...document,
    ...(updates.title !== undefined ? { title: updates.title } : null),
    ...(content !== undefined ? { content } : null),
    ...(updates.issueId !== undefined
      ? { linkedIssueId: updates.issueId ?? undefined }
      : null),
    updatedAt: new Date().toISOString(),
  };

  if (updates.projectId !== undefined) {
    next.projectId = updates.projectId ?? undefined;
    if (updates.projectName !== undefined) {
      next.projectName = updates.projectName ?? undefined;
    } else {
      next.projectName = undefined;
    }
  } else if (updates.projectName !== undefined) {
    next.projectName = updates.projectName ?? undefined;
  }

  if (updates.teamId !== undefined) {
    next.teamId = updates.teamId;
    if (updates.teamName !== undefined) {
      next.teamName = updates.teamName ?? undefined;
    } else {
      next.teamName = undefined;
    }
  } else if (updates.teamName !== undefined) {
    next.teamName = updates.teamName ?? undefined;
  }

  return next;
}

export function linearDocumentContentToListPatch(
  document: Pick<
    LinearDocumentContent,
    | "title"
    | "updatedAt"
    | "projectId"
    | "projectName"
    | "teamName"
    | "linkedIssueId"
    | "linkedIssueIdentifier"
  >,
): LinearDocumentListPatch {
  return {
    title: document.title,
    updatedAt: document.updatedAt,
    linkedIssueId: document.linkedIssueId,
    linkedIssueIdentifier: document.linkedIssueIdentifier,
    projectId: document.projectId,
    projectName: document.projectName,
    organization: document.teamName?.trim() || undefined,
  };
}

export function mergeLinearDocumentListPatch(
  document: LinearDocumentContent,
  patch: LinearDocumentListPatch,
): LinearDocumentContent {
  const next: LinearDocumentContent = { ...document };

  if (patch.title !== undefined) next.title = patch.title;
  if (patch.updatedAt !== undefined) next.updatedAt = patch.updatedAt;
  if (patch.linkedIssueId !== undefined) next.linkedIssueId = patch.linkedIssueId;
  if (patch.linkedIssueIdentifier !== undefined) {
    next.linkedIssueIdentifier = patch.linkedIssueIdentifier;
  }
  if (patch.projectId !== undefined) next.projectId = patch.projectId;
  if (patch.projectName !== undefined) next.projectName = patch.projectName;
  if (patch.organization !== undefined) next.teamName = patch.organization;

  return next;
}
