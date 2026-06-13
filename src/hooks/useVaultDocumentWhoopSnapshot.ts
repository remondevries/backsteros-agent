import { useEffect, useMemo, useState } from "react";
import type { WhoopSnapshotEntity } from "../chat/types";
import { fetchWhoopDay, type VaultDocumentContent } from "../lib/api";

export function useVaultDocumentWhoopSnapshot(
  document: VaultDocumentContent | null,
  options?: { refreshKey?: number; expectedPath?: string; expectedDate?: string | null },
) {
  const [liveSnapshot, setLiveSnapshot] = useState<WhoopSnapshotEntity | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);
  const expectedPath = options?.expectedPath ?? null;
  const expectedDate = options?.expectedDate?.trim() || null;
  const documentPath = document?.path ?? null;
  const frontmatterDate = document?.date?.trim() || null;
  const pathMatches = !expectedPath || expectedPath === documentPath;
  const fetchDate = pathMatches ? frontmatterDate : null;
  const displayDate = fetchDate ?? expectedDate;
  const datedFallbackSnapshot = useMemo<WhoopSnapshotEntity | null>(() => {
    if (!displayDate) return null;
    return {
      id: `whoop-${displayDate}`,
      date: displayDate,
      sleepPerformance: null,
      recoveryScore: null,
      strainScore: null,
    };
  }, [displayDate]);

  useEffect(() => {
    if (!pathMatches) {
      setLiveSnapshot(null);
      setLoadingLive(false);
      return;
    }

    if (!fetchDate) {
      setLiveSnapshot(null);
      setLoadingLive(false);
      return;
    }

    let cancelled = false;
    // Clear stale snapshot while resolving fresh Whoop state for this note/date.
    setLiveSnapshot(null);
    setLoadingLive(true);

    void (async () => {
      try {
        const whoop = await fetchWhoopDay(
          fetchDate,
          options?.refreshKey ? { force: true } : undefined,
        );
        if (!cancelled) {
          setLiveSnapshot(whoop.snapshot ?? null);
        }
      } finally {
        if (!cancelled) {
          setLoadingLive(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [documentPath, fetchDate, options?.refreshKey, pathMatches]);

  return {
    snapshot: pathMatches ? liveSnapshot ?? datedFallbackSnapshot : datedFallbackSnapshot,
    loading: pathMatches ? loadingLive : false,
  };
}
