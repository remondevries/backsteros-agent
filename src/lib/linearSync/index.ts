import type { LinearIssueEntity } from "../../chat/types";
import type { ProjectDocumentEntity } from "../documentStatusGroups";
import type { LinearIssueDetailUpdates } from "../api";
import { isDraftIssueId } from "../inboxDraftIssue";
import {
  enqueueLinearMutation,
  getLinearSyncCounts,
  getMergedPendingIssueUpdates,
  hasPendingMutationsForEntity,
  isLinearSyncPaused,
  isLinearSyncProcessing,
  retryLinearMutation,
  startLinearSyncProcessor,
  subscribeLinearSyncStatus,
} from "./processor";
import { rollbackOptimisticIssueCreate } from "./optimistic";
import { resolveMappedId, removePendingMutationsForEntity } from "./store";
import {
  clearPendingIssueUpdates,
} from "./pendingCache";
import {
  documentEntityKey,
  entityKeyFromPayload,
  issueEntityKey,
  type DocumentCreateKind,
  type IssueCreateKind,
  type LinearMutationPayload,
  type LinearSyncStatus,
  type StoredMutation,
} from "./types";

export {
  createDraftDocumentEntity,
  documentEntityKey,
  isDraftDocumentId,
  issueEntityKey,
  type DocumentCreateKind,
  type IssueCreateKind,
  type LinearMutationPayload,
  type StoredMutation,
} from "./types";

export { rollbackOptimisticDocumentCreate, rollbackOptimisticIssueCreate } from "./optimistic";

export const linearSync = {
  start(): void {
    startLinearSyncProcessor();
  },

  async enqueueIssueCreate(options: {
    kind: IssueCreateKind;
    teamId?: string;
    projectId?: string;
    title?: string;
    localIssue: LinearIssueEntity;
  }): Promise<StoredMutation> {
    const payload: LinearMutationPayload = {
      type: "issue.create",
      payload: {
        kind: options.kind,
        teamId: options.teamId,
        projectId: options.projectId,
        title: options.title,
        localIssue: options.localIssue,
      },
    };
    return enqueueLinearMutation(payload, issueEntityKey(options.localIssue.id));
  },

  async enqueueIssueUpdate(issueId: string, updates: LinearIssueDetailUpdates): Promise<StoredMutation> {
    const payload: LinearMutationPayload = {
      type: "issue.update",
      payload: { issueId, updates },
    };
    return enqueueLinearMutation(payload, issueEntityKey(issueId));
  },

  async enqueueIssueDelete(issueId: string): Promise<StoredMutation> {
    const payload: LinearMutationPayload = {
      type: "issue.delete",
      payload: { issueId },
    };
    return enqueueLinearMutation(payload, issueEntityKey(issueId));
  },

  async cancelDraftIssue(draftIssueId: string): Promise<void> {
    const id = draftIssueId.trim();
    if (!isDraftIssueId(id)) return;
    rollbackOptimisticIssueCreate(id);
    clearPendingIssueUpdates(id);
    await removePendingMutationsForEntity(issueEntityKey(id));
  },

  async enqueueDocumentCreate(options: {
    kind: DocumentCreateKind;
    teamId?: string;
    projectId?: string;
    title?: string;
    localDocument: ProjectDocumentEntity;
  }): Promise<StoredMutation> {
    const payload: LinearMutationPayload = {
      type: "document.create",
      payload: {
        kind: options.kind,
        teamId: options.teamId,
        projectId: options.projectId,
        title: options.title,
        localDocument: options.localDocument,
      },
    };
    return enqueueLinearMutation(
      payload,
      documentEntityKey(options.localDocument.linearDocumentId),
    );
  },

  async enqueueDocumentUpdate(
    documentId: string,
    updates: {
      title?: string;
      content?: string;
      body?: string;
      projectId?: string | null;
      teamId?: string;
      issueId?: string | null;
    },
  ): Promise<StoredMutation> {
    const payload: LinearMutationPayload = {
      type: "document.update",
      payload: { documentId, updates },
    };
    return enqueueLinearMutation(payload, documentEntityKey(documentId));
  },

  async enqueueDocumentDelete(documentId: string): Promise<StoredMutation> {
    const payload: LinearMutationPayload = {
      type: "document.delete",
      payload: { documentId },
    };
    return enqueueLinearMutation(payload, documentEntityKey(documentId));
  },

  async enqueueLetterUpload(options: {
    teamId: string;
    documentDraftId: string;
    draftIssueId: string;
    displayTitle: string;
    issueUpdates: LinearIssueDetailUpdates;
    file: Blob;
  }): Promise<StoredMutation> {
    clearPendingIssueUpdates(options.draftIssueId);
    await removePendingMutationsForEntity(issueEntityKey(options.draftIssueId));

    const payload: LinearMutationPayload = {
      type: "letter.upload",
      payload: {
        teamId: options.teamId,
        documentDraftId: options.documentDraftId,
        draftIssueId: options.draftIssueId,
        displayTitle: options.displayTitle,
        issueUpdates: options.issueUpdates,
      },
    };
    return enqueueLinearMutation(
      payload,
      documentEntityKey(options.documentDraftId),
      { blob: options.file },
    );
  },

  async resolveId(id: string): Promise<string> {
    return resolveMappedId(id);
  },

  getPendingFor(entityKey: string): Promise<boolean> {
    return hasPendingMutationsForEntity(entityKey);
  },

  getMergedPendingIssueUpdates(issueId: string): Promise<LinearIssueDetailUpdates | null> {
    return getMergedPendingIssueUpdates(issueId);
  },

  retry(mutationId: string): Promise<void> {
    return retryLinearMutation(mutationId);
  },

  onStatusChange(listener: () => void): () => void {
    return subscribeLinearSyncStatus(listener);
  },

  async getStatus(): Promise<LinearSyncStatus> {
    const counts = await getLinearSyncCounts();
    return {
      processing: isLinearSyncProcessing(),
      paused: isLinearSyncPaused(),
      failedCount: counts.failed,
      pendingCount: counts.pending,
    };
  },

  enqueue(payload: LinearMutationPayload): Promise<StoredMutation> {
    return enqueueLinearMutation(payload, entityKeyFromPayload(payload));
  },
};
