import { useEffect, useMemo, useState } from "react";
import type { WhoopSnapshotEntity } from "../chat/types";
import { fetchVaultDailyNoteToday, fetchWhoopToday, type VaultDocumentContent } from "../lib/api";
import { whoopSnapshotFromStats } from "../lib/whoopSnapshotFromStats";

export function useVaultDocumentWhoopSnapshot(
  document: VaultDocumentContent | null,
  options?: { refreshKey?: number },
) {
  const [liveSnapshot, setLiveSnapshot] = useState<WhoopSnapshotEntity | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);

  const frontmatterSnapshot = useMemo(() => {
    if (!document?.date || !document.whoop) return null;
    return whoopSnapshotFromStats(document.date, document.whoop);
  }, [document?.date, document?.whoop]);

  useEffect(() => {
    if (frontmatterSnapshot || !document?.date) {
      setLiveSnapshot(null);
      setLoadingLive(false);
      return;
    }

    let cancelled = false;
    setLoadingLive(true);

    void (async () => {
      try {
        const today = await fetchVaultDailyNoteToday();
        if (cancelled || today.note.date !== document.date) {
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
  }, [document?.date, frontmatterSnapshot, options?.refreshKey]);

  return {
    snapshot: frontmatterSnapshot ?? liveSnapshot,
    loading: loadingLive && !frontmatterSnapshot,
  };
}
