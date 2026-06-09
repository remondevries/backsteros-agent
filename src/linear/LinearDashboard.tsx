import { useCallback, useEffect, useMemo, useState } from "react";
import { LinearIcon } from "../chat/LinearIcon";
import { LinearIssueRow } from "../chat/LinearIssueRow";
import { LinearStatusIcon } from "../chat/LinearStatusIcon";
import { linearItemKey } from "../chat/linearIssue";
import { formatLinearDaySummary } from "../chat/morningReview";
import type { LinearIssueEntity } from "../chat/types";
import { AppDashboardShell } from "../app/AppDashboardShell";
import { fetchLinearToday, getHealth } from "../lib/api";
import { groupLinearIssuesByStatus } from "./groupLinearIssuesByStatus";

export function LinearDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [issues, setIssues] = useState<LinearIssueEntity[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadLinear = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const health = await getHealth();
      setConfigured(health.hasLinearApiKey);

      if (!health.hasLinearApiKey) {
        setIssues([]);
        return;
      }

      const result = await fetchLinearToday();
      setDueDate(result.dueDate);
      setIssues(result.issues);
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Linear issues");
      setIssues([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
      onRefresh={() => void loadLinear(true)}
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
