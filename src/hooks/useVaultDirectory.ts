import { useCallback, useEffect, useState } from "react";
import { listVaultDirectory, type VaultDirectoryEntry } from "../lib/api";

export function useVaultDirectory(path: string | null, enabled: boolean) {
  const [entries, setEntries] = useState<VaultDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !path) {
      setEntries([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await listVaultDirectory(path);
      setEntries(result.entries);
    } catch (err) {
      setEntries([]);
      setError(err instanceof Error ? err.message : "Failed to load folder contents");
    } finally {
      setLoading(false);
    }
  }, [enabled, path]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { entries, loading, error, refresh };
}
