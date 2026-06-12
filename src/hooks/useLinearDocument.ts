import { useCallback, useEffect, useState } from "react";
import {
  fetchLinearDocument,
  updateLinearDocument,
  type LinearDocumentContent,
} from "../lib/api";

export function useLinearDocument(documentId: string, enabled = true) {
  const [document, setDocument] = useState<LinearDocumentContent | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !documentId) {
      setDocument(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchLinearDocument(documentId).then((result) => {
      if (cancelled) return;
      if (result.error || !result.document) {
        setDocument(null);
        setError(result.error ?? "Failed to load document.");
      } else {
        setDocument(result.document);
        setError(null);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [documentId, enabled]);

  const save = useCallback(
    async (updates: { title?: string; content?: string }) => {
      const result = await updateLinearDocument(documentId, updates);
      if (result.error || !result.document) {
        return result.error ?? "Failed to save document.";
      }
      setDocument(result.document);
      return null;
    },
    [documentId],
  );

  const refresh = useCallback(async () => {
    if (!enabled || !documentId) return;
    setRefreshing(true);
    setError(null);
    try {
      const result = await fetchLinearDocument(documentId);
      if (result.error || !result.document) {
        setDocument(null);
        setError(result.error ?? "Failed to load document.");
      } else {
        setDocument(result.document);
        setError(null);
      }
    } finally {
      setRefreshing(false);
    }
  }, [documentId, enabled]);

  return { document, loading, refreshing, error, save, refresh };
}
