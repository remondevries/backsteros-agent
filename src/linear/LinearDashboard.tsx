import { useCallback, useEffect, useMemo, useState } from "react";
import { LinearIcon } from "../chat/LinearIcon";
import { LinearIssueRow } from "../chat/LinearIssueRow";
import { LinearStatusIcon } from "../chat/LinearStatusIcon";
import { linearItemKey } from "../chat/linearIssue";
import { formatLinearDaySummary } from "../chat/morningReview";
import type { LinearIssueEntity } from "../chat/types";
import { AppDashboardShell } from "../app/AppDashboardShell";
import { DASHBOARD_CACHE_TTL_MS, fetchLinearToday, peekCached, REQUEST_CACHE_KEYS } from "../lib/api";
import { groupLinearIssuesByStatus } from "./groupLinearIssuesByStatus";
import { useDashboardRefreshShortcut } from "../hooks/useDashboardRefreshShortcut";

type LinearTodayResult = Awaited<ReturnType<typeof fetchLinearToday>>;

function readCachedLinearToday(): LinearTodayResult | null {
  return peekCached<LinearTodayResult>(REQUEST_CACHE_KEYS.linearToday, DASHBOARD_CACHE_TTL_MS);
}

export function LinearDashboard({ isActive = true }: { isActive?: boolean }) {
  const initialCache = readCachedLinearToday();
  const [loading, setLoading] = useState(() => initialCache == null);
  const [refreshing, setRefreshing] = useState(false);
  const [configured, setConfigured] = useState(() => initialCache?.configured ?? false);
  const [dueDate, setDueDate] = useState(() => initialCache?.dueDate ?? "");
  const [issues, setIssues] = useState<LinearIssueEntity[]>(() => initialCache?.issues ?? []);
  const [error, setError] = useState<string | null>(() => initialCache?.error ?? null);

  const loadLinear = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (readCachedLinearToday() == null) {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await fetchLinearToday({ force: isRefresh });
      setConfigured(result.configured);
      setDueDate(result.dueDate);
      setIssues(result.issues);
      setError(result.error ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Linear issues");
      setIssues([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refreshLinear = useCallback(() => {
    void loadLinear(true);
  }, [loadLinear]);

  useDashboardRefreshShortcut({ isActive, onRefresh: refreshLinear });

  useEffect(() => {
    void loadLinear();
  }, [loadLinear]);

  const statusGroups = useMemo(() => groupLinearIssuesByStatus(issues), [issues]);
  const summary = formatLinearDaySummary(issues.length);

  return (
    <AppDashboardShell
      icon={<LinearIcon size={22} />}
      title="Linear"
      subtitle={dueDate ? `Due ${dueDate}` : "Today"}
      loading={loading}
      refreshing={refreshing}
      onRefresh={refreshLinear}
    >
      {loading ? (
        <p className="app-dashboard-empty">Loading Linear issues…</p>
      ) : !configured ? (
        <div className="app-dashboard-empty-state">
          <p>Linear is not configured. Add LINEAR_API_KEY to ~/.backsteros-agent/.env.</p>
        </div>
      ) : error && issues.length === 0 ? (
        <div className="app-dashboard-empty-state">
          <p>{error}</p>
          <button type="button" className="app-dashboard-action" onClick={() => void loadLinear(true)}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <p className="app-dashboard-summary">{summary}</p>

          {statusGroups.length > 0 ? (
            <div className="linear-status-groups">
              {statusGroups.map((group) => (
                <section key={group.status} className="linear-status-group">
                  <header className="linear-status-group-header">
                    <span className="linear-status-group-heading">
                      <LinearStatusIcon
                        status={group.status}
                        stateType={group.stateType}
                        title={group.status}
                      />
                      <span className="linear-status-group-title">{group.status}</span>
                    </span>
                    <span className="linear-status-group-count">{group.issues.length}</span>
                  </header>

                  <div className="morning-review-list linear-status-group-list">
                    {group.issues.map((item) => (
                      <LinearIssueRow key={linearItemKey(item)} item={item} hideStatus />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="morning-review-empty">Nothing due in Linear today.</p>
          )}
        </>
      )}
    </AppDashboardShell>
  );
}
