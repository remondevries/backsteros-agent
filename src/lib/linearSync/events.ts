import type { LinearIssueEntity } from "../../chat/types";
import type { ProjectDocumentEntity } from "../documentStatusGroups";

export type LinearLetterUploadCompleteEvent = {
  documentDraftId: string;
  document: ProjectDocumentEntity;
  issue: LinearIssueEntity;
  content?: string;
};

type LinearLetterUploadCompleteListener = (event: LinearLetterUploadCompleteEvent) => void;

const listeners = new Set<LinearLetterUploadCompleteListener>();

export function onLinearLetterUploadComplete(
  listener: LinearLetterUploadCompleteListener,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyLinearLetterUploadComplete(event: LinearLetterUploadCompleteEvent): void {
  for (const listener of listeners) {
    listener(event);
  }
}
