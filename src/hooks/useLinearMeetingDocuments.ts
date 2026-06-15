import { useCallback, useEffect, useState } from "react";
import { fetchLinearMeetingDocuments } from "../lib/api";
import type { ProjectDocumentEntity } from "../lib/documentStatusGroups";
import { onLinearDocumentListChange } from "../lib/linearDocumentListEvents";

export function useLinearMeetingDocuments({ enabled }: { enabled: boolean }) {
  const [documents, setDocuments] = useState<ProjectDocumentEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (options?: { background?: boolean }) => {
      if (!enabled) {
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
        const result = await fetchLinearMeetingDocuments();

        if (result.error) {
          setError(result.error);
          setDocuments([]);
        } else {
          setDocuments(result.documents);
        }
      } catch (err) {
        setDocuments([]);
        setError(err instanceof Error ? err.message : "Failed to load meeting documents");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [enabled],
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

  return {
    documents,
    loading,
    refreshing,
    error,
    refresh: refreshInBackground,
    prependDocument: useCallback((document: ProjectDocumentEntity) => {
      setDocuments((current) => [document, ...current]);
    }, []),
  };
}
