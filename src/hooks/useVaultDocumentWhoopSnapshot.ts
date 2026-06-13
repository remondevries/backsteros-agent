import { useEffect, useMemo, useState } from "react";
import type { WhoopSnapshotEntity } from "../chat/types";
import { fetchVaultDailyNoteToday, fetchWhoopToday, type VaultDocumentContent } from "../lib/api";
import { whoopSnapshotFromStats } from "../lib/whoopSnapshotFromStats";

export function useVaultDocumentWhoopSnapshot(
  document: VaultDocumentContent | null,
  options?: { refreshKey?: number; expectedPath?: string },
) {
  const [liveSnapshot, setLiveSnapshot] = useState<WhoopSnapshotEntity | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);
  const expectedPath = options?.expectedPath ?? null;
  const documentPath = document?.path ?? null;
  const documentDate = document?.date ?? null;
  const pathMatches = !expectedPath || expectedPath === documentPath;

  const frontmatterSnapshot = useMemo(() => {
    if (!pathMatches || !document?.date || !document.whoop) return null;
    return whoopSnapshotFromStats(document.date, document.whoop);
  }, [documentDate, document?.whoop, pathMatches]);
  const datedFallbackSnapshot = useMemo<WhoopSnapshotEntity | null>(() => {
    if (!pathMatches || !documentDate) return null;
    return {
      id: `whoop-${documentDate}`,
      date: documentDate,
      sleepPerformance: null,
      recoveryScore: null,
      strainScore: null,
    };
  }, [documentDate, pathMatches]);

  useEffect(() => {
    if (!pathMatches) {
      setLiveSnapshot(null);
      setLoadingLive(false);
      return;
    }

    if (frontmatterSnapshot || !documentDate) {
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
        const today = await fetchVaultDailyNoteToday();
        if (cancelled || today.note.date !== documentDate) {
          return;
        }

        const whoop = await fetchWhoopToday(
          options?.refreshKey ? { force: true } : undefined,
        );
        if (!cancelled) {
          setLiveSnapshot(whoop.snapshot);
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
  }, [documentDate, documentPath, frontmatterSnapshot, options?.refreshKey, pathMatches]);

  return {
    snapshot: pathMatches ? frontmatterSnapshot ?? liveSnapshot ?? datedFallbackSnapshot : null,
    loading: pathMatches ? loadingLive && !frontmatterSnapshot : false,
  };
}
