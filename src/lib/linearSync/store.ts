import {
  idbDeleteBlob,
  idbDeleteMutation,
  idbGetAllIdMaps,
  idbGetAllMutations,
  idbGetBlob,
  idbGetIdMap,
  idbGetMutationsByEntityKey,
  idbPutBlob,
  idbPutMutation,
  idbSetIdMap,
} from "./idb";
import type { LinearMutationPayload, StoredMutation } from "./types";

function isStoredMutation(value: unknown): value is StoredMutation {
  if (!value || typeof value !== "object") return false;
  const record = value as StoredMutation;
  return (
    typeof record.id === "string" &&
    typeof record.entityKey === "string" &&
    typeof record.createdAt === "number" &&
    record.payload &&
    typeof record.payload.type === "string"
  );
}

export async function loadAllMutations(): Promise<StoredMutation[]> {
  const raw = await idbGetAllMutations();
  return raw.filter(isStoredMutation);
}

export async function loadMutationsForEntity(entityKey: string): Promise<StoredMutation[]> {
  const raw = await idbGetMutationsByEntityKey(entityKey);
  return raw.filter(isStoredMutation);
}

export async function saveMutation(mutation: StoredMutation): Promise<void> {
  await idbPutMutation(mutation);
}

export async function removeMutation(id: string): Promise<void> {
  await idbDeleteMutation(id);
  await idbDeleteBlob(id);
}

export async function removePendingMutationsForEntity(
  entityKey: string,
  options?: { keepProcessing?: boolean },
): Promise<void> {
  const mutations = await loadMutationsForEntity(entityKey);
  for (const mutation of mutations) {
    if (options?.keepProcessing && mutation.status === "processing") continue;
    if (
      mutation.status === "pending" ||
      mutation.status === "failed" ||
      mutation.status === "processing"
    ) {
      await removeMutation(mutation.id);
    }
  }
}

export async function setIdMapping(localId: string, remoteId: string): Promise<void> {
  await idbSetIdMap(localId.trim(), remoteId.trim());
}

export async function resolveMappedId(id: string): Promise<string> {
  const trimmed = id.trim();
  const mapped = await idbGetIdMap(trimmed);
  return mapped ?? trimmed;
}

export async function loadIdMap(): Promise<Map<string, string>> {
  const records = await idbGetAllIdMaps();
  const map = new Map<string, string>();
  for (const record of records) {
    map.set(record.localId, record.remoteId);
  }
  return map;
}

export async function storeBlob(key: string, blob: Blob): Promise<void> {
  await idbPutBlob(key, blob);
}

export async function loadBlob(key: string): Promise<Blob | null> {
  return idbGetBlob(key);
}

export async function enqueueMutationRecord(
  payload: LinearMutationPayload,
  entityKey: string,
  options?: { blob?: Blob },
): Promise<StoredMutation> {
  const id = crypto.randomUUID();
  const record: StoredMutation = {
    id,
    status: "pending",
    entityKey,
    createdAt: Date.now(),
    retryCount: 0,
    payload,
    blobKey: options?.blob ? id : undefined,
  };

  if (options?.blob) {
    await storeBlob(id, options.blob);
  }

  await saveMutation(record);
  return record;
}
