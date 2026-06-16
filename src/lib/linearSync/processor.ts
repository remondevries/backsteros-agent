import {
  createLinearProjectDocument,
  createLinearProjectIssue,
  createLinearProjectMeetingDocument,
  createLinearTeamDocument,
  createLinearTeamIssue,
  createLinearTeamMeetingDocument,
  deleteLinearDocument,
  deleteLinearIssue,
  invalidateLinearContentListCaches,
  updateLinearDocument,
  updateLinearIssueDetail,
  uploadLinearTeamLetter,
  type LinearIssueDetailUpdates,
} from "../api";
import { isDraftIssueId } from "../inboxDraftIssue";
import { notifyLinearDocumentListChange } from "../linearDocumentListEvents";
import { notifyLinearIssueListChange } from "../linearIssueListEvents";
import {
  canCoalesceMutation,
  isDeleteMutation,
  mergeIntoStoredMutation,
  shouldSkipDueToDelete,
} from "./coalesce";
import {
  applyOptimisticMutation,
  reconcileDocumentCreateSuccess,
  reconcileDocumentUpdateSuccess,
  reconcileIssueCreateSuccess,
  reconcileIssueUpdateSuccess,
  reconcileLetterUploadSuccess,
  rollbackOptimisticDocumentCreate,
  rollbackOptimisticIssueCreate,
} from "./optimistic";
import { notifyLinearLetterUploadComplete } from "./events";
import { migrateLinearDocumentContentSeed } from "../linearDocumentContentSeed";
import { migrateLinearIssueDetailSeed } from "../linearIssueDetailSeed";
import {
  enqueueMutationRecord,
  loadAllMutations,
  loadBlob,
  removeMutation,
  removePendingMutationsForEntity,
  resolveMappedId,
  saveMutation,
  setIdMapping,
} from "./store";
import {
  clearPendingIssueUpdates,
  clearPendingIssueUpdatesForMappedId,
  mergePendingIssueUpdates,
} from "./pendingCache";
import { isDraftDocumentId, issueEntityKey, type LinearMutationPayload, type StoredMutation } from "./types";

const MAX_RETRIES = 3;
const BASE_RETRY_MS = 1000;

let processing = false;
let paused = false;
let started = false;
let wakeTimer: ReturnType<typeof setTimeout> | null = null;

type StatusListener = () => void;
const statusListeners = new Set<StatusListener>();

function notifyStatus(): void {
  for (const listener of statusListeners) {
    listener();
  }
}

function isRetryableError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("429") ||
    lower.includes("rate limit") ||
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("timeout") ||
    lower.includes("failed to fetch") ||
    lower.includes("503") ||
    lower.includes("502")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function subscribeLinearSyncStatus(listener: StatusListener): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

export function isLinearSyncPaused(): boolean {
  return paused;
}

export function setLinearSyncPaused(value: boolean): void {
  paused = value;
  notifyStatus();
  if (!value) {
    scheduleProcess();
  }
}

export async function getLinearSyncCounts(): Promise<{ pending: number; failed: number }> {
  const mutations = await loadAllMutations();
  let pending = 0;
  let failed = 0;
  for (const mutation of mutations) {
    if (mutation.status === "failed") failed += 1;
    else if (mutation.status === "pending" || mutation.status === "processing") pending += 1;
  }
  return { pending, failed };
}

function scheduleProcess(): void {
  if (wakeTimer) return;
  wakeTimer = setTimeout(() => {
    wakeTimer = null;
    void processQueue();
  }, 0);
}

export function isLinearSyncProcessing(): boolean {
  return processing;
}

export function startLinearSyncProcessor(): void {
  if (started) {
    scheduleProcess();
    return;
  }
  started = true;

  if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
      paused = false;
      notifyStatus();
      scheduleProcess();
    });
    window.addEventListener("offline", () => {
      paused = true;
      notifyStatus();
    });
    if (!window.navigator.onLine) {
      paused = true;
    }
  }

  void recoverStuckProcessingMutations()
    .then(() => replayPendingOptimisticState())
    .finally(() => {
      scheduleProcess();
    });
}

async function recoverStuckProcessingMutations(): Promise<void> {
  const mutations = await loadAllMutations();
  for (const mutation of mutations) {
    if (mutation.status !== "processing") continue;
    mutation.status = "pending";
    await saveMutation(mutation);
  }
}

async function replayPendingOptimisticState(): Promise<void> {
  const mutations = await loadAllMutations();
  const pending = mutations
    .filter(
      (mutation) =>
        mutation.status === "pending" ||
        mutation.status === "processing" ||
        mutation.status === "failed",
    )
    .sort((left, right) => left.createdAt - right.createdAt);

  for (const mutation of pending) {
    if (mutation.payload.type === "issue.update") {
      mergePendingIssueUpdates(
        mutation.payload.payload.issueId,
        mutation.payload.payload.updates,
      );
    }
    applyOptimisticMutation(mutation);
  }
}

export async function processQueue(): Promise<void> {
  if (processing || paused) return;
  processing = true;
  notifyStatus();

  try {
    while (!paused) {
      const mutations = await loadAllMutations();
      const sorted = mutations
        .filter((m) => m.status === "pending" || m.status === "failed")
        .sort((a, b) => a.createdAt - b.createdAt);

      const deleteMutations = sorted.filter((m) => isDeleteMutation(m.payload));

      const next = sorted.find((mutation) => {
        if (mutation.status === "failed" && mutation.retryCount >= MAX_RETRIES) return false;
        if (shouldSkipDueToDelete(mutation, deleteMutations)) return false;
        if (mutation.payload.type === "issue.update") {
          const draftIssueId = mutation.payload.payload.issueId;
          if (isDraftIssueId(draftIssueId)) {
            const createPending = sorted.some(
              (m) =>
                m.payload.type === "issue.create" &&
                m.payload.payload.localIssue.id === draftIssueId &&
                m.status !== "failed",
            );
            if (createPending) return false;
          }
        }
        if (mutation.payload.type === "document.update") {
          const draftDocumentId = mutation.payload.payload.documentId;
          if (isDraftDocumentId(draftDocumentId)) {
            const createPending = sorted.some(
              (m) =>
                m.payload.type === "document.create" &&
                m.payload.payload.localDocument.linearDocumentId === draftDocumentId &&
                m.status !== "failed",
            );
            if (createPending) return false;
          }
        }
        return true;
      });

      if (!next) break;

      next.status = "processing";
      await saveMutation(next);
      notifyStatus();

      const result = await executeMutation(next);
      if (result.ok) {
        await removeMutation(next.id);
        invalidateLinearContentListCaches();
        notifyStatus();
        continue;
      }

      next.retryCount += 1;
      next.lastError = result.error;
      if (next.retryCount >= MAX_RETRIES || !isRetryableError(result.error)) {
        next.status = "failed";
        await saveMutation(next);
        notifyPermanentFailure(next);
        notifyStatus();
        continue;
      }

      next.status = "pending";
      await saveMutation(next);
      notifyStatus();
      await sleep(BASE_RETRY_MS * 2 ** (next.retryCount - 1));
    }
  } finally {
    processing = false;
    notifyStatus();
  }
}

async function executeMutation(mutation: StoredMutation): Promise<{ ok: boolean; error: string }> {
  try {
    switch (mutation.payload.type) {
      case "issue.create":
        return await executeIssueCreate(mutation);
      case "issue.update":
        return await executeIssueUpdate(mutation);
      case "issue.delete":
        return await executeIssueDelete(mutation);
      case "document.create":
        return await executeDocumentCreate(mutation);
      case "document.update":
        return await executeDocumentUpdate(mutation);
      case "document.delete":
        return await executeDocumentDelete(mutation);
      case "letter.upload":
        return await executeLetterUpload(mutation);
      default:
        return { ok: false, error: "Unknown mutation type" };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Mutation failed" };
  }
}

async function executeIssueCreate(mutation: StoredMutation): Promise<{ ok: boolean; error: string }> {
  if (mutation.payload.type !== "issue.create") {
    return { ok: false, error: "Invalid mutation type for issue create." };
  }
  const { kind, teamId, projectId, title, localIssue } = mutation.payload.payload;
  const createTitle = title?.trim() || localIssue.title?.trim() || "Untitled";
  const result =
    kind === "project"
      ? await createLinearProjectIssue(projectId!.trim(), { title: createTitle })
      : await createLinearTeamIssue(teamId!.trim(), { title: createTitle });

  if (result.error || !result.issue) {
    return { ok: false, error: result.error ?? "Failed to create issue." };
  }

  await setIdMapping(localIssue.id, result.issue.id);
  clearPendingIssueUpdatesForMappedId(localIssue.id, result.issue.id);
  reconcileIssueCreateSuccess(localIssue, result.issue);
  return { ok: true, error: "" };
}

async function executeIssueUpdate(mutation: StoredMutation): Promise<{ ok: boolean; error: string }> {
  if (mutation.payload.type !== "issue.update") {
    return { ok: false, error: "Invalid mutation type for issue update." };
  }
  const { issueId, updates } = mutation.payload.payload;
  const resolvedId = await resolveMappedId(issueId);
  const result = await updateLinearIssueDetail(resolvedId, updates);
  if (result.error || !result.issue) {
    return { ok: false, error: result.error ?? "Failed to update issue." };
  }
  reconcileIssueUpdateSuccess(issueId, result.issue);
  clearPendingIssueUpdates(resolvedId);
  if (resolvedId !== issueId) {
    clearPendingIssueUpdates(issueId);
  }
  return { ok: true, error: "" };
}

async function executeIssueDelete(mutation: StoredMutation): Promise<{ ok: boolean; error: string }> {
  if (mutation.payload.type !== "issue.delete") {
    return { ok: false, error: "Invalid mutation type for issue delete." };
  }
  const resolvedId = await resolveMappedId(mutation.payload.payload.issueId);
  const result = await deleteLinearIssue(resolvedId);
  if (!result.success) {
    return { ok: false, error: result.error ?? "Failed to delete issue." };
  }
  return { ok: true, error: "" };
}

async function executeDocumentCreate(mutation: StoredMutation): Promise<{ ok: boolean; error: string }> {
  if (mutation.payload.type !== "document.create") {
    return { ok: false, error: "Invalid mutation type for document create." };
  }
  const { kind, teamId, projectId, title, localDocument } = mutation.payload.payload;
  const createTitle = title?.trim() || localDocument.title?.trim() || "Untitled";
  let result: { document: import("../documentStatusGroups").ProjectDocumentEntity | null; error?: string };

  switch (kind) {
    case "team":
      result = await createLinearTeamDocument(teamId!.trim(), { title: createTitle });
      break;
    case "team-meeting":
      result = await createLinearTeamMeetingDocument(teamId!.trim());
      break;
    case "project":
      result = await createLinearProjectDocument(projectId!.trim());
      break;
    case "project-meeting":
      result = await createLinearProjectMeetingDocument(projectId!.trim());
      break;
    default:
      return { ok: false, error: "Unknown document create kind" };
  }

  if (result.error || !result.document) {
    return { ok: false, error: result.error ?? "Failed to create document." };
  }

  await setIdMapping(localDocument.linearDocumentId, result.document.linearDocumentId);
  reconcileDocumentCreateSuccess(localDocument, result.document);
  return { ok: true, error: "" };
}

async function executeDocumentUpdate(mutation: StoredMutation): Promise<{ ok: boolean; error: string }> {
  if (mutation.payload.type !== "document.update") {
    return { ok: false, error: "Invalid mutation type for document update." };
  }
  const { documentId, updates } = mutation.payload.payload;
  const resolvedId = await resolveMappedId(documentId);
  const result = await updateLinearDocument(resolvedId, updates);
  if (result.error || !result.document) {
    return { ok: false, error: result.error ?? "Failed to update document." };
  }
  reconcileDocumentUpdateSuccess(documentId, resolvedId, result.document);
  return { ok: true, error: "" };
}

async function executeDocumentDelete(mutation: StoredMutation): Promise<{ ok: boolean; error: string }> {
  if (mutation.payload.type !== "document.delete") {
    return { ok: false, error: "Invalid mutation type for document delete." };
  }
  const resolvedId = await resolveMappedId(mutation.payload.payload.documentId);
  const result = await deleteLinearDocument(resolvedId);
  if (!result.ok) {
    return { ok: false, error: result.error ?? "Failed to delete document." };
  }
  return { ok: true, error: "" };
}

async function executeLetterUpload(mutation: StoredMutation): Promise<{ ok: boolean; error: string }> {
  if (mutation.payload.type !== "letter.upload") {
    return { ok: false, error: "Invalid mutation type for letter upload." };
  }
  const { teamId, displayTitle, issueUpdates, documentDraftId, draftIssueId } =
    mutation.payload.payload;
  const blobKey = mutation.blobKey ?? mutation.id;
  const blob = await loadBlob(blobKey);
  if (!blob) {
    return { ok: false, error: "Letter file missing from local storage." };
  }

  const file = new File([blob], displayTitle || "letter", { type: blob.type || "application/pdf" });
  const result = await uploadLinearTeamLetter(teamId, file, {
    displayTitle,
    issueUpdates,
  });

  if (result.error || !result.document || !result.issue) {
    return { ok: false, error: result.error ?? "Failed to upload letter." };
  }

  await setIdMapping(draftIssueId, result.issue.id);
  await setIdMapping(documentDraftId, result.document.linearDocumentId);
  migrateLinearIssueDetailSeed(draftIssueId, result.issue);
  migrateLinearDocumentContentSeed(documentDraftId, result.document, {
    content: result.content,
  });
  await removePendingMutationsForEntity(issueEntityKey(draftIssueId));
  clearPendingIssueUpdates(draftIssueId);
  clearPendingIssueUpdatesForMappedId(draftIssueId, result.issue.id);

  reconcileLetterUploadSuccess(result.document, result.issue, result.content);
  notifyLinearLetterUploadComplete({
    documentDraftId: mutation.payload.payload.documentDraftId,
    document: result.document,
    issue: result.issue,
    content: result.content,
  });
  return { ok: true, error: "" };
}

export async function enqueueLinearMutation(
  payload: LinearMutationPayload,
  entityKey: string,
  options?: { blob?: Blob },
): Promise<StoredMutation> {
  if (payload.type === "issue.update") {
    mergePendingIssueUpdates(payload.payload.issueId, payload.payload.updates);
  }

  const mutations = await loadAllMutations();
  const pendingForEntity = mutations.filter(
    (m) =>
      m.entityKey === entityKey &&
      (m.status === "pending" || m.status === "processing" || m.status === "failed"),
  );

  if (isDeleteMutation(payload)) {
    for (const existing of pendingForEntity) {
      if (existing.status !== "processing") {
        await removeMutation(existing.id);
      }
    }
  }

  const coalesceTarget = pendingForEntity.find(
    (existing) => canCoalesceMutation(existing, payload),
  );

  let record: StoredMutation;
  if (coalesceTarget) {
    record = mergeIntoStoredMutation(coalesceTarget, payload);
    record.status = "pending";
    record.lastError = undefined;
    await saveMutation(record);
  } else {
    record = await enqueueMutationRecord(payload, entityKey, options);
  }

  applyOptimisticMutation(record);
  scheduleProcess();
  return record;
}

export async function retryLinearMutation(mutationId: string): Promise<void> {
  const mutations = await loadAllMutations();
  const mutation = mutations.find((m) => m.id === mutationId);
  if (!mutation) return;
  mutation.status = "pending";
  mutation.retryCount = 0;
  mutation.lastError = undefined;
  await saveMutation(mutation);
  scheduleProcess();
}

export async function getMergedPendingIssueUpdates(
  issueId: string,
): Promise<LinearIssueDetailUpdates | null> {
  const entityKey = `issue:${issueId.trim()}`;
  const mutations = await loadAllMutations();
  const updates: LinearIssueDetailUpdates = {};
  let hasUpdates = false;

  for (const mutation of mutations) {
    if (mutation.entityKey !== entityKey) continue;
    if (mutation.payload.type !== "issue.update") continue;
    if (mutation.status === "done") continue;
    Object.assign(updates, mutation.payload.payload.updates);
    hasUpdates = true;
  }

  return hasUpdates ? updates : null;
}

export async function hasPendingMutationsForEntity(entityKey: string): Promise<boolean> {
  const mutations = await loadAllMutations();
  return mutations.some(
    (m) =>
      m.entityKey === entityKey &&
      (m.status === "pending" || m.status === "processing" || m.status === "failed"),
  );
}

function notifyPermanentFailure(mutation: StoredMutation): void {
  switch (mutation.payload.type) {
    case "issue.create":
      rollbackOptimisticIssueCreate(mutation.payload.payload.localIssue.id);
      break;
    case "document.create":
      rollbackOptimisticDocumentCreate(
        mutation.payload.payload.localDocument.linearDocumentId,
      );
      break;
    case "issue.delete":
      notifyLinearIssueListChange({ type: "refresh" });
      break;
    case "document.delete":
      notifyLinearDocumentListChange({ type: "refresh" });
      break;
    case "letter.upload":
      notifyLinearDocumentListChange({ type: "refresh" });
      notifyLinearIssueListChange({ type: "refresh" });
      break;
    default:
      break;
  }
}
