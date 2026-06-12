import { useCallback, useEffect, useState } from "react";
import {
  fetchLinearIssueDetail,
  updateLinearIssueDetail as patchLinearIssueDetail,
  type LinearIssueDetail,
  type LinearIssueDetailUpdates,
} from "../lib/api";

export function useLinearIssueDetail(issueId: string, enabled = true) {
  const [issue, setIssue] = useState<LinearIssueDetail | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !issueId) {
      setIssue(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchLinearIssueDetail(issueId).then((result) => {
      if (cancelled) return;
      if (result.error || !result.issue) {
        setIssue(null);
        setError(result.error ?? "Failed to load issue.");
      } else {
        setIssue(result.issue);
        setError(null);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, issueId]);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!enabled || !issueId) return;
    const silent = options?.silent ?? false;
    if (!silent) {
      setRefreshing(true);
    }
    setError(null);
    try {
      const result = await fetchLinearIssueDetail(issueId);
      if (result.error || !result.issue) {
        setIssue(null);
        setError(result.error ?? "Failed to load issue.");
      } else {
        setIssue(result.issue);
        setError(null);
      }
    } finally {
      if (!silent) {
        setRefreshing(false);
      }
    }
  }, [enabled, issueId]);

  const updateIssue = useCallback(
    async (updates: LinearIssueDetailUpdates): Promise<string | null> => {
      if (!enabled || !issueId) return "Issue updates are disabled.";
      setUpdating(true);
      setError(null);
      try {
        const result = await patchLinearIssueDetail(issueId, updates);
        if (result.error || !result.issue) {
          const message = result.error ?? "Failed to update issue.";
          setError(message);
          return message;
        }
        setIssue(result.issue);
        return null;
      } finally {
        setUpdating(false);
      }
    },
    [enabled, issueId],
  );

  return { issue, loading, refreshing, updating, error, refresh, updateIssue };
}
