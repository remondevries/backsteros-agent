import { useCallback, useEffect, useState } from "react";
import { AppDashboardShell } from "../app/AppDashboardShell";
import { WhoopIcon } from "../chat/WhoopIcon";
import { formatWhoopSnapshotDate, WhoopSnapshotCard } from "../chat/WhoopSnapshotCard";
import type { WhoopSnapshotEntity } from "../chat/types";
import {
  DASHBOARD_CACHE_TTL_MS,
  fetchWhoopToday,
  getWhoopSetup,
  peekCached,
  REQUEST_CACHE_KEYS,
} from "../lib/api";
import { openExternalUrl } from "../lib/openExternalUrl";
import { useDashboardRefreshShortcut } from "../hooks/useDashboardRefreshShortcut";

type WhoopTodayResult = Awaited<ReturnType<typeof fetchWhoopToday>>;

function readCachedWhoopToday(): WhoopTodayResult | null {
  return peekCached<WhoopTodayResult>(REQUEST_CACHE_KEYS.whoopToday, DASHBOARD_CACHE_TTL_MS);
}

export function WhoopDashboard({ isActive = true }: { isActive?: boolean }) {
  const initialCache = readCachedWhoopToday();
  const [loading, setLoading] = useState(() => initialCache == null);
  const [refreshing, setRefreshing] = useState(false);
  const [authenticated, setAuthenticated] = useState(() => initialCache?.authenticated ?? false);
  const [snapshot, setSnapshot] = useState<WhoopSnapshotEntity | null>(
    () => initialCache?.snapshot ?? null,
  );
  const [error, setError] = useState<string | null>(() => initialCache?.error ?? null);

  const loadSnapshot = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (readCachedWhoopToday() == null) {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await fetchWhoopToday({ force: isRefresh });
      setAuthenticated(result.authenticated);
      setSnapshot(result.snapshot);
      setError(result.error ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Whoop data");
      setSnapshot(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refreshSnapshot = useCallback(() => {
    void loadSnapshot(true);
  }, [loadSnapshot]);

  useDashboardRefreshShortcut({ isActive, onRefresh: refreshSnapshot });

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  async function handleWhoopSetup() {
    try {
      const setup = await getWhoopSetup();
      const instructions = [
        `Tokens file: ${setup.envPath}`,
        "",
        "1. Add WHOOP_EMAIL=your@email.com to that file",
        `2. Run in Terminal: ${setup.authCommand}`,
        "3. Copy WHOOP_IOS_BEARER_TOKEN, WHOOP_COGNITO_REFRESH_TOKEN, WHOOP_USER_ID, and WHOOP_INSTALLATION_ID into totem.env",
        "4. Restart BacksterOS Agent or refresh this view",
      ].join("\n");
      await navigator.clipboard.writeText(instructions);
      await openExternalUrl(setup.docsUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Whoop setup info");
    }
  }

  const dateLabel = snapshot?.date ? formatWhoopSnapshotDate(snapshot.date) : "Today";

  return (
    <AppDashboardShell
      icon={<WhoopIcon size={22} />}
      title="Whoop"
      subtitle={dateLabel}
      loading={loading}
      refreshing={refreshing}
      onRefresh={refreshSnapshot}
    >
      {loading ? (
        <p className="app-dashboard-empty">Loading today&apos;s Whoop data…</p>
      ) : !authenticated ? (
        <div className="app-dashboard-empty-state">
          <p>Whoop is not connected yet.</p>
          <button type="button" className="app-dashboard-action" onClick={() => void handleWhoopSetup()}>
            Whoop setup
          </button>
        </div>
      ) : error && !snapshot ? (
        <div className="app-dashboard-empty-state">
          <p>{error}</p>
          <button type="button" className="app-dashboard-action" onClick={() => void loadSnapshot(true)}>
            Try again
          </button>
        </div>
      ) : snapshot ? (
        <div className="app-dashboard-card">
          <WhoopSnapshotCard item={snapshot} showSleepDetails showStrainInsight />
        </div>
      ) : (
        <p className="app-dashboard-empty">No Whoop data for today yet.</p>
      )}
    </AppDashboardShell>
  );
}
