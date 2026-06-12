import { useCallback, useEffect, useState } from "react";
import type { LinearIssueEntity } from "../chat/types";
import { fetchLinearProjectIssues } from "../lib/api";

export function useLinearProjectIssues(projectId: string | null, enabled: boolean) {
  const [issues, setIssues] = useState<LinearIssueEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !projectId) {
      setIssues([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchLinearProjectIssues(projectId);
      if (result.error) {
        setError(result.error);
        setIssues([]);
      } else {
        setIssues(result.issues);
      }
    } catch (err) {
      setIssues([]);
      setError(err instanceof Error ? err.message : "Failed to load issues");
    } finally {
      setLoading(false);
    }
  }, [enabled, projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { issues, loading, error, refresh };
}
