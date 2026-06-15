import { useCallback, useEffect, useState } from "react";
import {
  fetchLinearDocument,
  updateLinearDocument,
  type LinearDocumentContent,
} from "../lib/api";
import { onLinearDocumentListChange } from "../lib/linearDocumentListEvents";
import {
  clearLinearDocumentContentSeed,
  peekLinearDocumentContentSeed,
} from "../lib/linearDocumentContentSeed";

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
    const seed = peekLinearDocumentContentSeed(documentId);
    if (seed) {
      setDocument(seed);
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
      setError(null);
    }

    void fetchLinearDocument(documentId).then((result) => {
      if (cancelled) return;
      if (result.error || !result.document) {
        setDocument(null);
        setError(result.error ?? "Failed to load document.");
      } else {
        setDocument(result.document);
        setError(null);
        clearLinearDocumentContentSeed(documentId);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [documentId, enabled]);

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

  useEffect(() => {
    if (!enabled || !documentId) return undefined;

    return onLinearDocumentListChange((change) => {
      if (change.type !== "refresh") return;
      if (change.documentId && change.documentId !== documentId) return;
      void refresh();
    });
  }, [documentId, enabled, refresh]);

  const save = useCallback(
    async (updates: {
      title?: string;
      content?: string;
      projectId?: string | null;
      teamId?: string;
      issueId?: string | null;
    }) => {
      const result = await updateLinearDocument(documentId, updates);
      if (result.error || !result.document) {
        return {
          error: result.error ?? "Failed to save document.",
          document: null,
        };
      }
      setDocument(result.document);
      return { error: null, document: result.document };
    },
    [documentId],
  );

  const assignProject = useCallback(
    async (projectId: string) => {
      const result = await save({ projectId });
      return { error: result.error, document: result.document };
    },
    [save],
  );

  const updateProperties = useCallback(
    async (updates: {
      teamId?: string;
      projectId?: string | null;
      title?: string;
      issueId?: string | null;
    }) => {
      const result = await save(updates);
      return { error: result.error, document: result.document };
    },
    [save],
  );

  return { document, loading, refreshing, error, save, assignProject, updateProperties, refresh };
}
