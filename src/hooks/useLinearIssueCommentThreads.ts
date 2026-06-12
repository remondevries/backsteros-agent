import { useCallback, useEffect, useState } from "react";
import {
  fetchLinearIssueCommentThreads,
  type LinearCommentThreadSummary,
} from "../lib/api";

export function useLinearIssueCommentThreads(issueId: string, enabled = true) {
  const [threads, setThreads] = useState<LinearCommentThreadSummary[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !issueId) return;
    setError(null);
    try {
      const result = await fetchLinearIssueCommentThreads(issueId);
      if (result.error) {
        setThreads([]);
        setError(result.error);
      } else {
        setThreads(result.threads);
        setError(null);
      }
    } catch {
      setThreads([]);
      setError("Failed to load comment threads.");
    } finally {
      setLoading(false);
    }
  }, [enabled, issueId]);

  useEffect(() => {
    if (!enabled || !issueId) {
      setThreads([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    void refresh();
  }, [enabled, issueId, refresh]);

  return { threads, loading, error, refresh };
}
