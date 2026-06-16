const DB_NAME = "backsteros-linear-sync";
const DB_VERSION = 1;

const MUTATIONS_STORE = "mutations";
const ID_MAP_STORE = "idMap";
const BLOBS_STORE = "blobs";

type IdMapRecord = { localId: string; remoteId: string };

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available"));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(MUTATIONS_STORE)) {
          const store = db.createObjectStore(MUTATIONS_STORE, { keyPath: "id" });
          store.createIndex("entityKey", "entityKey", { unique: false });
          store.createIndex("status", "status", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
        if (!db.objectStoreNames.contains(ID_MAP_STORE)) {
          db.createObjectStore(ID_MAP_STORE, { keyPath: "localId" });
        }
        if (!db.objectStoreNames.contains(BLOBS_STORE)) {
          db.createObjectStore(BLOBS_STORE, { keyPath: "key" });
        }
      };
    });
  }

  return dbPromise;
}

function runTransaction<T>(
  storeNames: string[],
  mode: IDBTransactionMode,
  run: (stores: Record<string, IDBObjectStore>) => Promise<T> | T,
): Promise<T> {
  return openDatabase().then((db) => {
    const transaction = db.transaction(storeNames, mode);
    const stores: Record<string, IDBObjectStore> = {};
    for (const name of storeNames) {
      stores[name] = transaction.objectStore(name);
    }
    return new Promise<T>((resolve, reject) => {
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
      transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
      let result!: T;
      Promise.resolve(run(stores))
        .then((value) => {
          result = value;
        })
        .catch(reject);
    });
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

export async function idbGetAllMutations(): Promise<unknown[]> {
  return runTransaction([MUTATIONS_STORE], "readonly", (stores) =>
    requestToPromise(stores[MUTATIONS_STORE].getAll()),
  );
}

export async function idbPutMutation(record: unknown): Promise<void> {
  await runTransaction([MUTATIONS_STORE], "readwrite", (stores) => {
    stores[MUTATIONS_STORE].put(record);
  });
}

export async function idbDeleteMutation(id: string): Promise<void> {
  await runTransaction([MUTATIONS_STORE], "readwrite", (stores) => {
    stores[MUTATIONS_STORE].delete(id);
  });
}

export async function idbGetMutationsByEntityKey(entityKey: string): Promise<unknown[]> {
  return runTransaction([MUTATIONS_STORE], "readonly", (stores) => {
    const index = stores[MUTATIONS_STORE].index("entityKey");
    return requestToPromise(index.getAll(entityKey));
  });
}

export async function idbSetIdMap(localId: string, remoteId: string): Promise<void> {
  await runTransaction([ID_MAP_STORE], "readwrite", (stores) => {
    stores[ID_MAP_STORE].put({ localId, remoteId });
  });
}

export async function idbGetIdMap(localId: string): Promise<string | null> {
  const record = await runTransaction([ID_MAP_STORE], "readonly", (stores) =>
    requestToPromise(stores[ID_MAP_STORE].get(localId) as IDBRequest<IdMapRecord | undefined>),
  );
  return record?.remoteId ?? null;
}

export async function idbGetAllIdMaps(): Promise<IdMapRecord[]> {
  return runTransaction([ID_MAP_STORE], "readonly", (stores) =>
    requestToPromise(stores[ID_MAP_STORE].getAll() as IDBRequest<IdMapRecord[]>),
  );
}

export async function idbPutBlob(key: string, blob: Blob): Promise<void> {
  await runTransaction([BLOBS_STORE], "readwrite", (stores) => {
    stores[BLOBS_STORE].put({ key, blob });
  });
}

export async function idbGetBlob(key: string): Promise<Blob | null> {
  const record = await runTransaction([BLOBS_STORE], "readonly", (stores) =>
    requestToPromise(stores[BLOBS_STORE].get(key) as IDBRequest<{ key: string; blob: Blob } | undefined>),
  );
  return record?.blob ?? null;
}

export async function idbDeleteBlob(key: string): Promise<void> {
  await runTransaction([BLOBS_STORE], "readwrite", (stores) => {
    stores[BLOBS_STORE].delete(key);
  });
}

export async function idbClearAll(): Promise<void> {
  await runTransaction([MUTATIONS_STORE, ID_MAP_STORE, BLOBS_STORE], "readwrite", (stores) => {
    stores[MUTATIONS_STORE].clear();
    stores[ID_MAP_STORE].clear();
    stores[BLOBS_STORE].clear();
  });
}
