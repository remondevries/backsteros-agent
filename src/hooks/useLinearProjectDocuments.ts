import { useCallback, useEffect, useState } from "react";
import {
  fetchLinearProjectDocuments,
  fetchLinearTeamDocuments,
} from "../lib/api";
import type { ProjectDocumentEntity } from "../lib/documentStatusGroups";
import { onLinearDocumentListChange } from "../lib/linearDocumentListEvents";

export function useLinearProjectDocuments({
  projectId,
  teamId,
  enabled,
  dailyOnly,
}: {
  projectId?: string | null;
  teamId?: string | null;
  enabled: boolean;
  /** When loading team documents, return only YYYY-MM-DD daily journal titles. */
  dailyOnly?: boolean;
}) {
  const [documents, setDocuments] = useState<ProjectDocumentEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (options?: { background?: boolean }) => {
      if (!enabled || (!projectId && !teamId)) {
        setDocuments([]);
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
        const result = projectId
          ? await fetchLinearProjectDocuments(projectId, { force: isBackgroundRefresh })
          : await fetchLinearTeamDocuments(teamId!, { dailyOnly, force: isBackgroundRefresh });

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
        setRefreshing(false);
      }
    },
    [enabled, projectId, teamId, dailyOnly],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return onLinearDocumentListChange((change) => {
      if (change.type === "refresh") {
        void refresh({ background: true });
        return;
      }

      if (change.type === "remove") {
        setDocuments((current) =>
          current.filter((document) => document.linearDocumentId !== change.linearDocumentId),
        );
        return;
      }

      if (change.type === "prepend") {
        setDocuments((current) => {
          if (current.some((doc) => doc.linearDocumentId === change.document.linearDocumentId)) {
            return current;
          }
          return [change.document, ...current];
        });
        return;
      }

      if (change.type === "replace") {
        setDocuments((current) =>
          current.map((document) =>
            document.linearDocumentId === change.previousId ? change.document : document,
          ),
        );
        return;
      }

      setDocuments((current) =>
        current.map((document) =>
          document.linearDocumentId === change.linearDocumentId
            ? { ...document, ...change.patch }
            : document,
        ),
      );
    });
  }, [refresh]);

  const refreshInBackground = useCallback(() => refresh({ background: true }), [refresh]);

  const prependDocument = useCallback((document: ProjectDocumentEntity) => {
    setDocuments((current) => {
      if (current.some((item) => item.linearDocumentId === document.linearDocumentId)) {
        return current;
      }
      return [document, ...current];
    });
  }, []);

  return {
    documents,
    loading,
    refreshing,
    error,
    refresh: refreshInBackground,
    prependDocument,
  };
}
