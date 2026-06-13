import { useCallback, useEffect, useState } from "react";
import { fetchVaultDocument, updateVaultDocument, type VaultDocumentContent } from "../lib/api";
import { onVaultContentChanged } from "../lib/vaultContentEvents";

const EXTERNAL_SYNC_INTERVAL_MS = 2_000;

export function useVaultDocument(path: string, enabled = true) {
  const [vaultDocument, setVaultDocument] = useState<VaultDocumentContent | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocument = useCallback(
    async (options?: { force?: boolean }) => {
      if (!enabled || !path) return null;

      const result = await fetchVaultDocument(path, { force: options?.force ?? false });
      if (result.error || !result.document) {
        setVaultDocument(null);
        setError(result.error ?? "Failed to load document.");
        return null;
      }

      setVaultDocument(result.document);
      setError(null);
      return result.document;
    },
    [enabled, path],
  );

  useEffect(() => {
    if (!enabled || !path) {
      setVaultDocument(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void loadDocument({ force: true }).finally(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, loadDocument, path]);

  useEffect(() => {
    if (!enabled || !path) return undefined;

    let cancelled = false;

    async function syncFromDisk() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      const result = await fetchVaultDocument(path, { force: true });
      if (cancelled || result.error || !result.document) return;
      setVaultDocument(result.document);
      setError(null);
    }

    const interval = window.setInterval(() => {
      void syncFromDisk();
    }, EXTERNAL_SYNC_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncFromDisk();
      }
    };

    const handleWindowFocus = () => {
      void syncFromDisk();
    };

    const unsubscribeVault = onVaultContentChanged(() => {
      void syncFromDisk();
    });

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      unsubscribeVault();
    };
  }, [enabled, path]);

  const save = useCallback(
    async (updates: { title?: string; body?: string }) => {
      const result = await updateVaultDocument(path, updates);
      if (result.error || !result.document) {
        return {
          error: result.error ?? "Failed to save document.",
          document: null,
        };
      }
      setVaultDocument(result.document);
      return { error: null, document: result.document };
    },
    [path],
  );

  const refresh = useCallback(async () => {
    if (!enabled || !path) return;
    setRefreshing(true);
    setError(null);
    try {
      await loadDocument({ force: true });
    } finally {
      setRefreshing(false);
    }
  }, [enabled, loadDocument, path]);

  return { document: vaultDocument, loading, refreshing, error, save, refresh };
}
