/**
 * Client-side request cache with inflight deduplication.
 *
 * Invalidation rules:
 * - `settings` — invalidate on updateSettings()
 * - `vault-dir:*`, `vault-doc:*`, `vault-search-index` — invalidate on vault writes (create/update/delete)
 * - `linear-overview:{id}`, `linear-issues:{id}` — invalidate on explicit refresh or issue mutations
 * - Dashboard keys — invalidate via invalidateDashboardRequestCache() on sidecar reconnect
 */
type CacheEntry<T> = {
  value: T;
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export const REQUEST_CACHE_KEYS = {
  health: "health",
  linearToday: "linear-today",
  whoopToday: "whoop-today",
  vaultDailyNoteToday: "vault-daily-note-today",
  settings: "settings",
  linearTeams: "linear-teams",
  linearProjectsAll: "linear-projects-all",
  vaultSearchIndex: "vault-search-index",
} as const;

export const HEALTH_CACHE_TTL_MS = 30_000;
export const DASHBOARD_CACHE_TTL_MS = 120_000;
export const SETTINGS_CACHE_TTL_MS = 60_000;
export const VAULT_LIST_CACHE_TTL_MS = 20_000;
export const LINEAR_PROJECT_CACHE_TTL_MS = 60_000;
export const LINEAR_ISSUES_CACHE_TTL_MS = 45_000;

export function cacheKeyLinearOverview(projectId: string) {
  return `linear-overview:${projectId}`;
}

export function cacheKeyLinearIssues(projectId: string) {
  return `linear-issues:${projectId}`;
}

export function cacheKeyVaultDirectory(path: string) {
  return `vault-dir:${path}`;
}

export function cacheKeyVaultDocument(path: string) {
  return `vault-doc:${path}`;
}

export function peekCached<T>(key: string, ttlMs: number): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt >= ttlMs) return null;
  return entry.value as T;
}

export function invalidateRequestCache(key?: string): void {
  if (key) {
    cache.delete(key);
    inflight.delete(key);
    return;
  }

  cache.clear();
  inflight.clear();
}

export function invalidateRequestCacheByPrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
  for (const key of inflight.keys()) {
    if (key.startsWith(prefix)) {
      inflight.delete(key);
    }
  }
}

export function invalidateVaultContentCaches(): void {
  invalidateRequestCacheByPrefix("vault-dir:");
  invalidateRequestCacheByPrefix("vault-doc:");
  invalidateRequestCache(REQUEST_CACHE_KEYS.vaultSearchIndex);
}

export function invalidateDashboardRequestCache(): void {
  invalidateRequestCache(REQUEST_CACHE_KEYS.health);
  invalidateRequestCache(REQUEST_CACHE_KEYS.linearToday);
  invalidateRequestCache(REQUEST_CACHE_KEYS.whoopToday);
  invalidateRequestCache(REQUEST_CACHE_KEYS.vaultDailyNoteToday);
}

export async function cachedRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttlMs?: number; force?: boolean } = {},
): Promise<T> {
  const ttlMs = options.ttlMs ?? DASHBOARD_CACHE_TTL_MS;
  const force = options.force ?? false;

  if (!force) {
    const cached = peekCached<T>(key, ttlMs);
    if (cached != null) {
      return cached;
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
