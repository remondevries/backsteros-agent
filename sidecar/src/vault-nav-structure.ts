import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { normalizeVaultRelativePath, shouldSkipVaultDirectory } from "./vault-paths.ts";
import { resolveVaultNoteWhoopStats, type VaultNoteWhoopStats } from "./vault/vault-whoop-stats.ts";

export const VAULT_NAV_FOLDER_NAMES = [
  "Inbox",
  "Daily",
  "Workouts",
  "Meetings",
  "Financials",
  "Knowledge Base",
  "Letters",
  "Organizations",
  "Contacts",
] as const;

export type VaultNavFolderName = (typeof VAULT_NAV_FOLDER_NAMES)[number];

export type VaultDirectoryEntry = {
  name: string;
  kind: "file" | "directory";
  path: string;
  date?: string | null;
  whoop?: VaultNoteWhoopStats | null;
};

function enrichMarkdownFileEntry(
  notesPath: string,
  entry: Pick<VaultDirectoryEntry, "name" | "kind" | "path">,
): VaultDirectoryEntry {
  if (entry.kind !== "file" || !entry.name.toLowerCase().endsWith(".md")) {
    return entry;
  }

  const { date, whoop } = resolveVaultNoteWhoopStats(notesPath, entry.path);
  return {
    ...entry,
    ...(date ? { date } : {}),
    ...(whoop ? { whoop } : {}),
  };
}

function resolveWorkspacePath(notesPath: string, targetPath: string): string {
  const abs = join(notesPath, targetPath);
  const rel = relative(notesPath, abs);
  if (rel.startsWith("..") || rel === "..") {
    throw new Error("Path must stay inside the notes workspace");
  }
  return abs;
}

function isVaultNavFolderName(name: string): name is VaultNavFolderName {
  return (VAULT_NAV_FOLDER_NAMES as readonly string[]).includes(name);
}

export function assertVaultNavRelativePath(relativePath: string): string {
  const normalized = normalizeVaultRelativePath(relativePath);
  if (!normalized) {
    throw new Error("Path is required");
  }

  const topSegment = normalized.split("/")[0] ?? "";
  if (!isVaultNavFolderName(topSegment)) {
    throw new Error("Path must be within a local vault navigation folder");
  }

  return normalized;
}

export function ensureVaultNavFolders(notesPath: string): string[] {
  if (!existsSync(notesPath) || !statSync(notesPath).isDirectory()) {
    throw new Error("Notes folder does not exist");
  }

  const created: string[] = [];
  for (const folderName of VAULT_NAV_FOLDER_NAMES) {
    const abs = join(notesPath, folderName);
    if (existsSync(abs)) continue;
    mkdirSync(abs, { recursive: true });
    created.push(folderName);
  }
  return created;
}

export function listVaultDirectoryEntries(
  notesPath: string,
  relativePath: string,
  options?: { enrich?: "none" | "dates" | "whoop" },
): VaultDirectoryEntry[] {
  const enrich = options?.enrich ?? "none";
  const normalized = assertVaultNavRelativePath(relativePath);
  const abs = resolveWorkspacePath(notesPath, normalized);

  if (!existsSync(abs)) {
    return [];
  }

  if (!statSync(abs).isDirectory()) {
    throw new Error("Path is not a directory");
  }

  const entries = readdirSync(abs, { withFileTypes: true })
    .filter((entry) => {
      if (entry.name.startsWith(".")) return false;
      if (entry.isDirectory() && shouldSkipVaultDirectory(entry.name)) return false;
      return entry.isFile() || entry.isDirectory();
    })
    .map((entry) => {
      const base = {
        name: entry.name,
        kind: entry.isDirectory() ? ("directory" as const) : ("file" as const),
        path: join(normalized, entry.name).replace(/\\/g, "/"),
      };
      if (enrich === "whoop") {
        return enrichMarkdownFileEntry(notesPath, base);
      }
      return base;
    });

  entries.sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === "directory" ? -1 : 1;
    }
    return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
  });

  return entries;
}
