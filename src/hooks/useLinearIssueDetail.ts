import { useCallback, useEffect, useState } from "react";
import { fetchLinearIssueDetail, type LinearIssueDetail } from "../lib/api";

export function useLinearIssueDetail(issueId: string, enabled = true) {
  const [issue, setIssue] = useState<LinearIssueDetail | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
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

  const refresh = useCallback(async () => {
    if (!enabled || !issueId) return;
    setRefreshing(true);
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
      setRefreshing(false);
    }
  }, [enabled, issueId]);

  return { issue, loading, refreshing, error, refresh };
}
