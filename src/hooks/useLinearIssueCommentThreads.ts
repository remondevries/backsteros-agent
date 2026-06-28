import { useCallback, useEffect, useState } from "react";
import { fetchLinearCommentThreads } from "../lib/api";
import type { LinearCommentTarget } from "../lib/linearCommentTarget";
import type { LinearCommentThreadSummary } from "../lib/api";

export function useLinearCommentThreads(target: LinearCommentTarget | null, enabled = true) {
  const [threads, setThreads] = useState<LinearCommentThreadSummary[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !target) return;
    setError(null);
    try {
      const result = await fetchLinearCommentThreads(target);
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
  }, [enabled, target]);

  useEffect(() => {
    if (!enabled || !target) {
      setThreads([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    void refresh();
  }, [enabled, target, refresh]);

  return { threads, loading, error, refresh };
}

/** @deprecated Use useLinearCommentThreads with `{ kind: "issue", id }` */
export function useLinearIssueCommentThreads(issueId: string, enabled = true) {
  return useLinearCommentThreads(issueId ? { kind: "issue", id: issueId } : null, enabled);
}
