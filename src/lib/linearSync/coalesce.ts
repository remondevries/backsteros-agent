import type {
  DocumentUpdatePayload,
  IssueUpdatePayload,
  LinearMutationPayload,
  StoredMutation,
} from "./types";

export function mergeIssueUpdates(
  left: IssueUpdatePayload["updates"],
  right: IssueUpdatePayload["updates"],
): IssueUpdatePayload["updates"] {
  return { ...left, ...right };
}

export function mergeDocumentUpdates(
  left: DocumentUpdatePayload["updates"],
  right: DocumentUpdatePayload["updates"],
): DocumentUpdatePayload["updates"] {
  return { ...left, ...right };
}

export function canCoalesceMutation(
  existing: StoredMutation,
  incoming: LinearMutationPayload,
): boolean {
  if (existing.status === "processing" || existing.status === "done") {
    return false;
  }
  if (existing.payload.type === "issue.update" && incoming.type === "issue.update") {
    return existing.payload.payload.issueId === incoming.payload.issueId;
  }
  if (existing.payload.type === "document.update" && incoming.type === "document.update") {
    return existing.payload.payload.documentId === incoming.payload.documentId;
  }
  return false;
}

export function mergeIntoStoredMutation(
  existing: StoredMutation,
  incoming: LinearMutationPayload,
): StoredMutation {
  if (existing.payload.type === "issue.update" && incoming.type === "issue.update") {
    return {
      ...existing,
      payload: {
        type: "issue.update",
        payload: {
          issueId: existing.payload.payload.issueId,
          updates: mergeIssueUpdates(existing.payload.payload.updates, incoming.payload.updates),
        },
      },
    };
  }

  if (existing.payload.type === "document.update" && incoming.type === "document.update") {
    return {
      ...existing,
      payload: {
        type: "document.update",
        payload: {
          documentId: existing.payload.payload.documentId,
          updates: mergeDocumentUpdates(
            existing.payload.payload.updates,
            incoming.payload.updates,
          ),
        },
      },
    };
  }

  return existing;
}

export function isDeleteMutation(payload: LinearMutationPayload): boolean {
  return payload.type === "issue.delete" || payload.type === "document.delete";
}

export function shouldSkipDueToDelete(
  mutation: StoredMutation,
  deleteMutations: StoredMutation[],
): boolean {
  if (mutation.payload.type === "issue.delete" || mutation.payload.type === "document.delete") {
    return false;
  }
  const entityKey = mutation.entityKey;
  return deleteMutations.some(
    (deleteMutation) =>
      deleteMutation.entityKey === entityKey &&
      deleteMutation.createdAt <= mutation.createdAt,
  );
}
