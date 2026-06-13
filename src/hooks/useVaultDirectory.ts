import { useCallback, useEffect, useState } from "react";
import { listVaultDirectory, type VaultDirectoryEntry } from "../lib/api";

type UseVaultDirectoryOptions = {
  flattenFiles?: boolean;
};

async function listVaultFilesRecursively(path: string): Promise<VaultDirectoryEntry[]> {
  const queue = [path];
  const visited = new Set<string>();
  const files: VaultDirectoryEntry[] = [];

  while (queue.length > 0) {
    const currentPath = queue.shift();
    if (!currentPath || visited.has(currentPath)) continue;
    visited.add(currentPath);

    const result = await listVaultDirectory(currentPath);
    for (const entry of result.entries) {
      if (entry.kind === "file") {
        files.push(entry);
      } else if (entry.kind === "directory") {
        queue.push(entry.path);
      }
    }
  }

  files.sort((left, right) => left.path.localeCompare(right.path, undefined, { sensitivity: "base" }));
  return files;
}

export function useVaultDirectory(
  path: string | null,
  enabled: boolean,
  options?: UseVaultDirectoryOptions,
) {
  const [entries, setEntries] = useState<VaultDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flattenFiles = options?.flattenFiles ?? false;

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
      if (flattenFiles) {
        const flattenedEntries = await listVaultFilesRecursively(path);
        setEntries(flattenedEntries);
      } else {
        const result = await listVaultDirectory(path);
        setEntries(result.entries);
      }
    } catch (err) {
      setEntries([]);
      setError(err instanceof Error ? err.message : "Failed to load folder contents");
    } finally {
      setLoading(false);
    }
  }, [enabled, flattenFiles, path]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { entries, loading, error, refresh };
}
