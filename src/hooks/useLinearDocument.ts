import { useCallback, useEffect, useState } from "react";
import {
  fetchLinearDocument,
  type LinearDocumentContent,
} from "../lib/api";
import { onLinearDocumentListChange } from "../lib/linearDocumentListEvents";
import { isDraftDocumentId } from "../lib/linearSync";
import { linearSync } from "../lib/linearSync";
import {
  clearLinearDocumentContentSeed,
  peekLinearDocumentContentSeed,
} from "../lib/linearDocumentContentSeed";

function applyDocumentUpdatesLocal(
  document: LinearDocumentContent,
  updates: {
    title?: string;
    content?: string;
    body?: string;
    projectId?: string | null;
    teamId?: string;
    issueId?: string | null;
  },
): LinearDocumentContent {
  const content = updates.content ?? updates.body;
  return {
    ...document,
    ...(updates.title !== undefined ? { title: updates.title } : null),
    ...(content !== undefined ? { content } : null),
    ...(updates.projectId !== undefined ? { projectId: updates.projectId ?? undefined } : null),
    ...(updates.teamId !== undefined ? { teamId: updates.teamId } : null),
    ...(updates.issueId !== undefined
      ? { linkedIssueId: updates.issueId ?? undefined }
      : null),
    updatedAt: new Date().toISOString(),
  };
}

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

    if (isDraftDocumentId(documentId) && seed) {
      return () => {
        cancelled = true;
      };
    }

    void linearSync.resolveId(documentId).then((resolvedId) =>
      fetchLinearDocument(resolvedId).then((result) => {
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
      }),
    );

    return () => {
      cancelled = true;
    };
  }, [documentId, enabled]);

  const refresh = useCallback(async () => {
    if (!enabled || !documentId) return;
    // #region agent log
    fetch("http://127.0.0.1:7933/ingest/280fb855-6de7-45c0-90bf-5ee8faee78a1", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "180d80" },
      body: JSON.stringify({
        sessionId: "180d80",
        hypothesisId: "DOC1",
        location: "useLinearDocument.ts:refresh",
        message: "Fetching document from API",
        data: { documentId },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    setRefreshing(true);
    setError(null);
    try {
      const resolvedId = await linearSync.resolveId(documentId);
      const result = await fetchLinearDocument(resolvedId);
      if (result.error || !result.document) {
        setDocument(null);
        setError(result.error ?? "Failed to load document.");
      } else {
        setDocument(result.document);
        setError(null);
        // #region agent log
        fetch("http://127.0.0.1:7933/ingest/280fb855-6de7-45c0-90bf-5ee8faee78a1", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "180d80" },
          body: JSON.stringify({
            sessionId: "180d80",
            hypothesisId: "DOC1",
            location: "useLinearDocument.ts:refreshDone",
            message: "Document refresh loaded",
            data: { documentId, contentLength: result.document.content.length },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
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
      body?: string;
      projectId?: string | null;
      teamId?: string;
      issueId?: string | null;
    }): Promise<
      | { error: string; document: null }
      | { error: null; document: LinearDocumentContent }
    > => {
      let nextDocument: LinearDocumentContent | null = null;
      setDocument((current) => {
        if (!current) return current;
        nextDocument = applyDocumentUpdatesLocal(current, updates);
        return nextDocument;
      });

      try {
        await linearSync.enqueueDocumentUpdate(documentId, updates);
        if (!nextDocument) {
          return {
            error: "Document is not loaded.",
            document: null,
          };
        }
        return { error: null, document: nextDocument };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save document.";
        return { error: message, document: null };
      }
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
