import { existsSync, statSync } from "node:fs";
import { listVaultFiles } from "./vault-files.ts";

export type VaultSearchIndexEntry = {
  path: string;
  title: string;
  folder: string;
};

export function buildVaultSearchIndex(notesPath: string): VaultSearchIndexEntry[] {
  if (!existsSync(notesPath) || !statSync(notesPath).isDirectory()) {
    return [];
  }

  return listVaultFiles(notesPath)
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
}
