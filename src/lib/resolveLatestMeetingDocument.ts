import type { ActiveVaultDocument } from "../app/contentPanelNavigation";
import { listVaultDirectory, type VaultDirectoryEntry } from "./api";
import { formatVaultNoteDisplayName } from "./vaultNoteDisplayName";

const ISO_DATE_PATTERN = /\b\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:?\d{2}(?::?\d{2})?)?\b/;

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTimestampFromPath(path: string): number | null {
  const match = path.match(ISO_DATE_PATTERN);
  if (!match) return null;
  return parseTimestamp(match[0]);
}

function compareByRecency(left: VaultDirectoryEntry, right: VaultDirectoryEntry): number {
  const leftTimestamp = parseTimestamp(left.date) ?? parseTimestampFromPath(left.path) ?? Number.NEGATIVE_INFINITY;
  const rightTimestamp =
    parseTimestamp(right.date) ?? parseTimestampFromPath(right.path) ?? Number.NEGATIVE_INFINITY;

  if (leftTimestamp !== rightTimestamp) {
    return rightTimestamp - leftTimestamp;
  }

  return right.path.localeCompare(left.path, undefined, { sensitivity: "base" });
}

async function listMeetingFilesRecursively(path: string): Promise<VaultDirectoryEntry[]> {
  const queue = [path];
  const visited = new Set<string>();
  const files: VaultDirectoryEntry[] = [];

  while (queue.length > 0) {
    const currentPath = queue.shift();
    if (!currentPath || visited.has(currentPath)) continue;
    visited.add(currentPath);

    const result = await listVaultDirectory(currentPath);
    for (const entry of result.entries) {
      if (entry.kind === "directory") {
        queue.push(entry.path);
        continue;
      }
      if (!entry.name.toLowerCase().endsWith(".md")) continue;
      files.push(entry);
    }
  }

  return files;
}

export async function resolveLatestVaultDocumentInFolder(
  rootPath: string,
): Promise<ActiveVaultDocument | null> {
  const files = await listMeetingFilesRecursively(rootPath);
  if (files.length === 0) return null;

  const latest = files.slice().sort(compareByRecency)[0];
  if (!latest) return null;

  return {
    path: latest.path,
    title: formatVaultNoteDisplayName(latest.name),
  };
}

const MEETINGS_ROOT_PATH = "Meetings";

export async function resolveLatestMeetingDocument(): Promise<ActiveVaultDocument | null> {
  return resolveLatestVaultDocumentInFolder(MEETINGS_ROOT_PATH);
}
