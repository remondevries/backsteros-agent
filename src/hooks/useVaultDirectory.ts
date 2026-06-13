import { useCallback, useEffect, useState } from "react";
import { listVaultDirectory, type VaultDirectoryEntry } from "../lib/api";

type UseVaultDirectoryOptions = {
  flattenFiles?: boolean;
  enrich?: "none" | "whoop";
};

export function useVaultDirectory(
  path: string | null,
  enabled: boolean,
  options?: UseVaultDirectoryOptions,
) {
  const [entries, setEntries] = useState<VaultDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flattenFiles = options?.flattenFiles ?? false;
  const enrich = options?.enrich ?? "none";

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
      const result = await listVaultDirectory(path, {
        flatten: flattenFiles,
        enrich,
      });
      setEntries(result.entries);
    } catch (err) {
      setEntries([]);
      setError(err instanceof Error ? err.message : "Failed to load folder contents");
    } finally {
      setLoading(false);
    }
  }, [enabled, enrich, flattenFiles, path]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { entries, loading, error, refresh };
}
