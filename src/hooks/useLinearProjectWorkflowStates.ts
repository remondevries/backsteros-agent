import { useCallback, useEffect, useState } from "react";
import { fetchLinearProjectIssues } from "../lib/api";
import type { LinearWorkflowState } from "./useLinearProjectIssues";

/** Workflow states only — shares cached `/linear/projects/:id/issues` with issue panels. */
export function useLinearProjectWorkflowStates(projectId: string | null, enabled: boolean) {
  const [workflowStates, setWorkflowStates] = useState<LinearWorkflowState[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !projectId) {
      setWorkflowStates([]);
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
        setWorkflowStates([]);
      } else {
        setWorkflowStates(result.workflowStates ?? []);
      }
    } catch (err) {
      setWorkflowStates([]);
      setError(err instanceof Error ? err.message : "Failed to load workflow states");
    } finally {
      setLoading(false);
    }
  }, [enabled, projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { workflowStates, loading, error, refresh };
}
