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
} as const;

export const HEALTH_CACHE_TTL_MS = 30_000;
export const DASHBOARD_CACHE_TTL_MS = 120_000;

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
