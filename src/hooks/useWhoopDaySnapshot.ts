import { useEffect, useMemo, useState } from "react";
import type { WhoopSnapshotEntity } from "../chat/types";
import { fetchWhoopDay } from "../lib/api";

export function useWhoopDaySnapshot(
  date: string | null,
  options?: { refreshKey?: number; enabled?: boolean },
) {
  const enabled = options?.enabled !== false && Boolean(date?.trim());
  const normalizedDate = date?.trim() || null;
  const [liveSnapshot, setLiveSnapshot] = useState<WhoopSnapshotEntity | null>(null);
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  const datedFallbackSnapshot = useMemo<WhoopSnapshotEntity | null>(() => {
    if (!normalizedDate) return null;
    return {
      id: `whoop-${normalizedDate}`,
      date: normalizedDate,
      sleepPerformance: null,
      recoveryScore: null,
      strainScore: null,
    };
  }, [normalizedDate]);

  useEffect(() => {
    if (!enabled || !normalizedDate) {
      setLiveSnapshot(null);
      setLoading(false);
      setAuthenticated(null);
      return;
    }

    let cancelled = false;
    setLiveSnapshot(null);
    setLoading(true);
    setAuthenticated(null);

    void (async () => {
      try {
        const whoop = await fetchWhoopDay(
          normalizedDate,
          options?.refreshKey ? { force: true } : undefined,
        );
        if (cancelled) return;
        setAuthenticated(whoop.authenticated);
        setLiveSnapshot(whoop.snapshot ?? null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, normalizedDate, options?.refreshKey]);

  return {
    snapshot: liveSnapshot ?? datedFallbackSnapshot,
    loading,
    authenticated,
  };
}
