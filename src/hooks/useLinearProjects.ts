import { useCallback, useEffect, useState } from "react";
import { fetchLinearProjectsPage, type LinearProjectSummary } from "../lib/api";

function mergeProjects(
  current: LinearProjectSummary[],
  incoming: LinearProjectSummary[],
): LinearProjectSummary[] {
  const seen = new Set(current.map((project) => project.id));
  const next = [...current];
  for (const project of incoming) {
    if (seen.has(project.id)) continue;
    seen.add(project.id);
    next.push(project);
  }
  return next;
}

export function useLinearProjects(enabled: boolean) {
  const [projects, setProjects] = useState<LinearProjectSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setProjects([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let after: string | null = null;
      let loaded: LinearProjectSummary[] = [];

      for (;;) {
        const page = await fetchLinearProjectsPage({
          after: after ?? undefined,
          first: 50,
        });
        loaded = mergeProjects(loaded, page.projects);
        if (!page.pageInfo.hasNextPage || !page.pageInfo.endCursor) break;
        after = page.pageInfo.endCursor;
      }

      setProjects(loaded);
    } catch (err) {
      setProjects([]);
      setError(err instanceof Error ? err.message : "Failed to load Linear projects");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { projects, loading, error, refresh };
}
