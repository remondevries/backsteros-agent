import { useCallback, useEffect, useState } from "react";
import type { LinearIssueEntity } from "../chat/types";
import { isCompletedLinearIssue } from "../chat/linearIssue";
import { fetchLinearTeamIssues } from "../lib/api";
import { onLinearIssueListChange } from "../lib/linearIssueListEvents";
import type { LinearWorkflowState } from "./useLinearProjectIssues";

function filterOpenInboxIssues(issues: LinearIssueEntity[]): LinearIssueEntity[] {
  return issues.filter((issue) => !isCompletedLinearIssue(issue));
}

export function useLinearTeamIssues(
  teamId: string | null,
  enabled: boolean,
  options?: { excludeCompleted?: boolean; excludeSubIssues?: boolean },
) {
  const excludeCompleted = options?.excludeCompleted ?? true;
  const excludeSubIssues = options?.excludeSubIssues ?? false;
  const applyIssueFilter = useCallback(
    (issues: LinearIssueEntity[]) =>
      excludeCompleted ? filterOpenInboxIssues(issues) : issues,
    [excludeCompleted],
  );
  const [issues, setIssues] = useState<LinearIssueEntity[]>([]);
  const [workflowStates, setWorkflowStates] = useState<LinearWorkflowState[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (options?: { background?: boolean }) => {
      if (!enabled || !teamId) {
        setIssues([]);
        setWorkflowStates([]);
        setError(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const isBackgroundRefresh = options?.background ?? false;
      if (isBackgroundRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const result = await fetchLinearTeamIssues(teamId, {
          excludeSubIssues,
          force: isBackgroundRefresh,
        });
        if (result.error) {
          setError(result.error);
          setIssues([]);
          setWorkflowStates([]);
        } else {
          setIssues(applyIssueFilter(result.issues));
          setWorkflowStates(result.workflowStates ?? []);
        }
      } catch (err) {
        setIssues([]);
        setWorkflowStates([]);
        setError(err instanceof Error ? err.message : "Failed to load issues");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applyIssueFilter, enabled, excludeSubIssues, teamId],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return onLinearIssueListChange((change) => {
      if (change.type === "refresh") {
        void refresh({ background: true });
        return;
      }

      if (change.type === "remove") {
        setIssues((current) => current.filter((issue) => issue.id !== change.issueId));
        return;
      }

      if (change.type === "prepend") {
        setIssues((current) => {
          if (current.some((issue) => issue.id === change.issue.id)) return current;
          return applyIssueFilter([change.issue, ...current]);
        });
        return;
      }

      if (change.type === "replace") {
        setIssues((current) =>
          applyIssueFilter(
            current.map((issue) =>
              issue.id === change.previousId ? change.issue : issue,
            ),
          ),
        );
        return;
      }

      setIssues((current) =>
        applyIssueFilter(
          current.map((issue) =>
            issue.id === change.issueId ? { ...issue, ...change.patch } : issue,
          ),
        ),
      );
    });
  }, [applyIssueFilter, refresh]);

  const refreshInBackground = useCallback(() => refresh({ background: true }), [refresh]);

  const prependIssue = useCallback((issue: LinearIssueEntity) => {
    setIssues((current) => {
      if (current.some((item) => item.id === issue.id)) {
        return current;
      }
      return applyIssueFilter([issue, ...current]);
    });
  }, [applyIssueFilter]);

  const replaceIssue = useCallback((previousId: string, issue: LinearIssueEntity) => {
    setIssues((current) =>
      applyIssueFilter(current.map((item) => (item.id === previousId ? issue : item))),
    );
  }, [applyIssueFilter]);

  const removeIssue = useCallback((issueId: string) => {
    setIssues((current) => current.filter((issue) => issue.id !== issueId));
  }, []);

  return {
    issues,
    workflowStates,
    loading,
    refreshing,
    error,
    refresh: refreshInBackground,
    prependIssue,
    replaceIssue,
    removeIssue,
  };
}
