import { useCallback, useEffect, useState } from "react";
import { AppDashboardShell } from "../app/AppDashboardShell";
import { WhoopIcon } from "../chat/WhoopIcon";
import { formatWhoopSnapshotDate, WhoopSnapshotCard } from "../chat/WhoopSnapshotCard";
import type { WhoopSnapshotEntity } from "../chat/types";
import { fetchWhoopToday, getHealth, getWhoopSetup } from "../lib/api";
import { openExternalUrl } from "../lib/openExternalUrl";

export function WhoopDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [snapshot, setSnapshot] = useState<WhoopSnapshotEntity | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const health = await getHealth();
      setAuthenticated(health.hasWhoopAuth);

      if (!health.hasWhoopAuth) {
        setSnapshot(null);
        return;
      }

      const result = await fetchWhoopToday();
      setSnapshot(result.snapshot);
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Whoop data");
      setSnapshot(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
      onRefresh={() => void loadSnapshot(true)}
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
