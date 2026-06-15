const LINEAR_LIST_CACHE_TTL_MS = 60_000;

type CacheEntry<T> = {
  value: T;
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function invalidateLinearListCache(key?: string): void {
  if (key) {
    cache.delete(key);
    inflight.delete(key);
    return;
  }
  cache.clear();
  inflight.clear();
}

export function invalidateLinearListCacheByPrefix(prefix: string): void {
  for (const entryKey of cache.keys()) {
    if (entryKey.startsWith(prefix)) {
      cache.delete(entryKey);
    }
  }
  for (const entryKey of inflight.keys()) {
    if (entryKey.startsWith(prefix)) {
      inflight.delete(entryKey);
    }
  }
}

export async function cachedLinearList<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { force?: boolean },
): Promise<T> {
  const force = options?.force ?? false;

  if (!force) {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.fetchedAt < LINEAR_LIST_CACHE_TTL_MS) {
      return entry.value as T;
    }

    const pending = inflight.get(key);
    if (pending) {
      return pending as Promise<T>;
    }
  } else {
    inflight.delete(key);
  }

  const promise = fetcher()
    .then((value) => {
      cache.set(key, { value, fetchedAt: Date.now() });
      inflight.delete(key);
      return value;
    })
    .catch((error) => {
      inflight.delete(key);
      throw error;
    });

  inflight.set(key, promise);
  return promise;
}

export const linearListCacheKeys = {
  teamApiDocuments: (teamId: string) => `team-api-documents:${teamId}`,
  projectApiDocuments: (projectId: string) => `project-api-documents:${projectId}`,
  teamIssues: (teamId: string, rootOnly: boolean) =>
    `team-issues:${teamId}:${rootOnly ? "root" : "all"}`,
  teamProjects: (teamId: string) => `team-projects:${teamId}`,
  meetingDocuments: () => "meeting-documents",
  projectIssues: (projectId: string) => `project-issues:${projectId}`,
} as const;
