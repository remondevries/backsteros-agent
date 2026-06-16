export type LinearDocumentListPatch = {
  title?: string;
  updatedAt?: string;
  linkedIssueId?: string;
  linkedIssueIdentifier?: string;
};

export type LinearDocumentListChange =
  | { type: "update"; linearDocumentId: string; patch: LinearDocumentListPatch }
  | { type: "prepend"; document: import("./documentStatusGroups").ProjectDocumentEntity }
  | { type: "replace"; previousId: string; document: import("./documentStatusGroups").ProjectDocumentEntity }
  | { type: "remove"; linearDocumentId: string }
  | { type: "refresh"; documentId?: string };

type LinearDocumentListChangeListener = (change: LinearDocumentListChange) => void;

const listeners = new Set<LinearDocumentListChangeListener>();

export function onLinearDocumentListChange(
  listener: LinearDocumentListChangeListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyLinearDocumentListChange(change: LinearDocumentListChange): void {
  for (const listener of listeners) {
    listener(change);
  }
}
