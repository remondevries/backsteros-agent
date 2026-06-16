import { useCallback, useEffect, useState } from "react";
import type { LinearIssueEntity } from "../chat/types";
import { fetchLinearProjectIssues } from "../lib/api";
import { onLinearIssueListChange } from "../lib/linearIssueListEvents";
import { linearSync } from "../lib/linearSync";
import {
  addLinearWatcherStreamListener,
  isLinearWatcherPollEvent,
} from "../lib/linearWatcherEvents";
import { isLinearWatcherChangeEvent } from "../lib/notificationPayloads";

export type LinearWorkflowState = {
  id: string;
  name: string;
  type: string;
  color?: string;
  position?: number;
};

export function useLinearProjectIssues(projectId: string | null, enabled: boolean) {
  const [issues, setIssues] = useState<LinearIssueEntity[]>([]);
  const [workflowStates, setWorkflowStates] = useState<LinearWorkflowState[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (options?: { background?: boolean }) => {
      if (!enabled || !projectId) {
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
        const result = await fetchLinearProjectIssues(projectId, { force: isBackgroundRefresh });
        if (result.error) {
          setError(result.error);
          setIssues([]);
          setWorkflowStates([]);
        } else {
          setIssues(result.issues);
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
    [enabled, projectId],
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
          return [change.issue, ...current];
        });
        return;
      }

      if (change.type === "replace") {
        setIssues((current) =>
          current.map((issue) => (issue.id === change.previousId ? change.issue : issue)),
        );
        return;
      }

      setIssues((current) =>
        current.map((issue) =>
          issue.id === change.issueId ? { ...issue, ...change.patch } : issue,
        ),
      );
    });
  }, [refresh]);

  useEffect(() => {
    if (!enabled || !projectId) return undefined;

    return addLinearWatcherStreamListener((event) => {
      if (isLinearWatcherPollEvent(event)) return;
      if (!isLinearWatcherChangeEvent(event)) return;
      if (event.projectId !== projectId) return;
      void linearSync.getStatus().then((status) => {
        if (status.pendingCount > 0) return;
        void refresh({ background: true });
      });
    });
  }, [enabled, projectId, refresh]);

  const refreshInBackground = useCallback(() => refresh({ background: true }), [refresh]);

  const prependIssue = useCallback((issue: LinearIssueEntity) => {
    setIssues((current) => {
      if (current.some((item) => item.id === issue.id)) {
        return current;
      }
      return [issue, ...current];
    });
  }, []);

  const replaceIssue = useCallback((previousId: string, issue: LinearIssueEntity) => {
    setIssues((current) => current.map((item) => (item.id === previousId ? issue : item)));
  }, []);

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
