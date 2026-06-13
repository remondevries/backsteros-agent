import { existsSync, statSync } from "node:fs";
import { listVaultFiles } from "../vault-files.ts";

export type VaultSearchIndexEntry = {
  path: string;
  title: string;
  folder: string;
};

let cachedSearchIndex: { notesPath: string; mtimeMs: number; entries: VaultSearchIndexEntry[] } | null =
  null;

export function invalidateVaultSearchIndexCache(): void {
  cachedSearchIndex = null;
}

export function buildVaultSearchIndex(notesPath: string): VaultSearchIndexEntry[] {
  if (!existsSync(notesPath) || !statSync(notesPath).isDirectory()) {
    return [];
  }

  const mtimeMs = statSync(notesPath).mtimeMs;
  if (
    cachedSearchIndex &&
    cachedSearchIndex.notesPath === notesPath &&
    cachedSearchIndex.mtimeMs === mtimeMs
  ) {
    return cachedSearchIndex.entries;
  }

  const entries = listVaultFiles(notesPath)
    .filter((path) => path.toLowerCase().endsWith(".md"))
    .map((path) => {
      const segments = path.split("/");
      const filename = segments[segments.length - 1] ?? path;
      return {
        path,
        title: filename.replace(/\.md$/i, ""),
        folder: segments.length > 1 ? (segments[0] ?? "") : "",
      };
    });

  cachedSearchIndex = { notesPath, mtimeMs, entries };
  return entries;
}
