import { useCallback, useEffect, useState } from "react";
import {
  fetchLinearProjectDocuments,
  fetchLinearTeamDocuments,
} from "../lib/api";
import type { ProjectDocumentEntity } from "../lib/documentStatusGroups";

export function useLinearProjectDocuments({
  projectId,
  teamId,
  enabled,
}: {
  projectId?: string | null;
  teamId?: string | null;
  enabled: boolean;
}) {
  const [documents, setDocuments] = useState<ProjectDocumentEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || (!projectId && !teamId)) {
      setDocuments([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = projectId
        ? await fetchLinearProjectDocuments(projectId)
        : await fetchLinearTeamDocuments(teamId!);

      if (result.error) {
        setError(result.error);
        setDocuments([]);
      } else {
        setDocuments(result.documents);
      }
    } catch (err) {
      setDocuments([]);
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [enabled, projectId, teamId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { documents, loading, error, refresh };
}
