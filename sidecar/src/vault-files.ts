import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { isExcludedVaultPath, shouldSkipVaultDirectory } from "./vault-paths.ts";

export function listVaultFiles(notesPath: string): string[] {
  const results: string[] = [];

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (shouldSkipVaultDirectory(entry.name)) {
          continue;
        }
        walk(join(dir, entry.name));
        continue;
      }
      if (!entry.isFile()) continue;

      const abs = join(dir, entry.name);
      const rel = abs.slice(notesPath.length + 1).replace(/\\/g, "/");
      if (!isExcludedVaultPath(rel)) {
        results.push(rel);
      }
    }
  };

  walk(notesPath);
  return results;
}

export function vaultFileExists(notesPath: string, vaultRelativePath: string): boolean {
  if (isExcludedVaultPath(vaultRelativePath)) {
    return false;
  }
  const abs = join(notesPath, vaultRelativePath);
  return existsSync(abs) && statSync(abs).isFile();
}

export function buildVaultPathIndex(notesPath: string): Map<string, string> {
  const index = new Map<string, string>();
  for (const path of listVaultFiles(notesPath)) {
    index.set(path.toLowerCase(), path);
  }
  return index;
}

export function canonicalVaultPath(
  vaultIndex: Map<string, string>,
  vaultRelativePath: string,
): string | null {
  return vaultIndex.get(vaultRelativePath.replace(/\\/g, "/").toLowerCase()) ?? null;
}
