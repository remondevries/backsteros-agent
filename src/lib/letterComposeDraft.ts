import type { ActiveLinearDocument } from "../app/contentPanelNavigation";
import type { LinearIssueEntity } from "../chat/types";
import { createLetterDraftIssue } from "./inboxDraftIssue";
import { displayTitleFromUploadFilename } from "./letterDocumentContent";

export const LETTER_COMPOSE_DRAFT_DOCUMENT_ID_PREFIX = "draft-letter-compose:";

const draftFiles = new Map<string, File>();
const draftIssueIds = new Map<string, string>();

export function isLetterComposeDraftDocumentId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith(LETTER_COMPOSE_DRAFT_DOCUMENT_ID_PREFIX);
}

export function createLetterComposeDraftDocument(title = "New letter"): ActiveLinearDocument {
  return {
    id: `${LETTER_COMPOSE_DRAFT_DOCUMENT_ID_PREFIX}${crypto.randomUUID()}`,
    title: title.trim() || "New letter",
  };
}

export function bindLetterComposeDraftIssue(
  documentDraftId: string,
  issue: LinearIssueEntity,
): LinearIssueEntity {
  const documentId = documentDraftId.trim();
  if (!isLetterComposeDraftDocumentId(documentId)) {
    return issue;
  }
  draftIssueIds.set(documentId, issue.id);
  return issue;
}

export function getLetterComposeDraftIssueId(documentDraftId: string): string | null {
  return draftIssueIds.get(documentDraftId.trim()) ?? null;
}

export function createLetterComposeDraftIssueForDocument(
  documentDraftId: string,
  title = "Untitled",
): LinearIssueEntity {
  const issue = createLetterDraftIssue(title);
  bindLetterComposeDraftIssue(documentDraftId, issue);
  return issue;
}

export function setLetterComposeDraftFile(documentDraftId: string, file: File | null): void {
  const id = documentDraftId.trim();
  if (!isLetterComposeDraftDocumentId(id)) return;
  if (!file) {
    draftFiles.delete(id);
    return;
  }
  draftFiles.set(id, file);
}

export function getLetterComposeDraftFile(documentDraftId: string): File | null {
  return draftFiles.get(documentDraftId.trim()) ?? null;
}

export function suggestLetterComposeTitleFromFile(file: File): string {
  return displayTitleFromUploadFilename(file.name);
}

export function clearLetterComposeDraft(documentDraftId: string): void {
  const id = documentDraftId.trim();
  draftFiles.delete(id);
  draftIssueIds.delete(id);
}
