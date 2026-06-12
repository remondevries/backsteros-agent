import { useCallback, useEffect, useState } from "react";
import { fetchVaultDocument, updateVaultDocument, type VaultDocumentContent } from "../lib/api";

export function useVaultDocument(path: string, enabled = true) {
  const [document, setDocument] = useState<VaultDocumentContent | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !path) {
      setDocument(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchVaultDocument(path).then((result) => {
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
  }, [enabled, path]);

  const save = useCallback(
    async (updates: { title?: string; body?: string }) => {
      const result = await updateVaultDocument(path, updates);
      if (result.error || !result.document) {
        return result.error ?? "Failed to save document.";
      }
      setDocument(result.document);
      return null;
    },
    [path],
  );

  return { document, loading, error, save };
}
