import type { LinearIssueEntity } from "../../chat/types";
import type { ProjectDocumentEntity } from "../documentStatusGroups";
import type { LinearIssueDetailUpdates } from "../api";

export const DRAFT_DOCUMENT_ID_PREFIX = "draft-doc:";

export type MutationStatus = "pending" | "processing" | "failed" | "done";

export type IssueCreateKind = "team" | "project";

export type DocumentCreateKind = "team" | "project" | "team-meeting" | "project-meeting";

export type IssueCreatePayload = {
  kind: IssueCreateKind;
  teamId?: string;
  projectId?: string;
  title?: string;
  localIssue: LinearIssueEntity;
};

export type IssueUpdatePayload = {
  issueId: string;
  updates: LinearIssueDetailUpdates;
};

export type IssueDeletePayload = {
  issueId: string;
};

export type DocumentCreatePayload = {
  kind: DocumentCreateKind;
  teamId?: string;
  projectId?: string;
  title?: string;
  localDocument: ProjectDocumentEntity;
};

export type DocumentUpdatePayload = {
  documentId: string;
  updates: {
    title?: string;
    content?: string;
    body?: string;
    projectId?: string | null;
    teamId?: string;
    issueId?: string | null;
  };
};

export type DocumentDeletePayload = {
  documentId: string;
};

export type LetterUploadPayload = {
  teamId: string;
  documentDraftId: string;
  draftIssueId: string;
  displayTitle: string;
  issueUpdates: LinearIssueDetailUpdates;
};

export type LinearMutationPayload =
  | { type: "issue.create"; payload: IssueCreatePayload }
  | { type: "issue.update"; payload: IssueUpdatePayload }
  | { type: "issue.delete"; payload: IssueDeletePayload }
  | { type: "document.create"; payload: DocumentCreatePayload }
  | { type: "document.update"; payload: DocumentUpdatePayload }
  | { type: "document.delete"; payload: DocumentDeletePayload }
  | { type: "letter.upload"; payload: LetterUploadPayload };

export type StoredMutation = {
  id: string;
  status: MutationStatus;
  entityKey: string;
  createdAt: number;
  retryCount: number;
  lastError?: string;
  payload: LinearMutationPayload;
  blobKey?: string;
};

export type LinearSyncStatus = {
  processing: boolean;
  paused: boolean;
  failedCount: number;
  pendingCount: number;
};

export function isDraftDocumentId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith(DRAFT_DOCUMENT_ID_PREFIX);
}

export function issueEntityKey(issueId: string): string {
  return `issue:${issueId.trim()}`;
}

export function documentEntityKey(documentId: string): string {
  return `document:${documentId.trim()}`;
}

export function entityKeyFromPayload(payload: LinearMutationPayload): string {
  switch (payload.type) {
    case "issue.create":
      return issueEntityKey(payload.payload.localIssue.id);
    case "issue.update":
      return issueEntityKey(payload.payload.issueId);
    case "issue.delete":
      return issueEntityKey(payload.payload.issueId);
    case "document.create":
      return documentEntityKey(payload.payload.localDocument.linearDocumentId);
    case "document.update":
      return documentEntityKey(payload.payload.documentId);
    case "document.delete":
      return documentEntityKey(payload.payload.documentId);
    case "letter.upload":
      return documentEntityKey(payload.payload.documentDraftId);
    default:
      return "unknown";
  }
}

export function createDraftDocumentEntity(options: {
  projectId?: string;
  projectName?: string;
  teamId?: string;
  title?: string;
}): ProjectDocumentEntity {
  const linearDocumentId = `${DRAFT_DOCUMENT_ID_PREFIX}${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  return {
    id: linearDocumentId,
    linearDocumentId,
    projectId: options.projectId?.trim() ?? "",
    projectName: options.projectName?.trim() ?? "",
    title: options.title?.trim() || "Untitled",
    status: "Inbox",
    statusGroup: "Inbox",
    organization: "",
    owner: "",
    category: "",
    date: null,
    updatedAt: now,
  };
}
