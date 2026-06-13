const WHOOP_SNAPSHOT_TTL_MS = 120_000;

type WhoopCacheEntry = {
  fetchedAt: number;
  snapshot: unknown;
};

const whoopSnapshotCache = new Map<string, WhoopCacheEntry>();

export function peekWhoopSnapshotCache(date: string): unknown | null {
  const entry = whoopSnapshotCache.get(date);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt >= WHOOP_SNAPSHOT_TTL_MS) {
    whoopSnapshotCache.delete(date);
    return null;
  }
  return entry.snapshot;
}

export function setWhoopSnapshotCache(date: string, snapshot: unknown): void {
  whoopSnapshotCache.set(date, { fetchedAt: Date.now(), snapshot });
}
