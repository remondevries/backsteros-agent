import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { loadUserTimezone } from "../context/profile.ts";
import { formatDateInTimezone, joinFrontmatterAndBody, readDailyNoteStats, splitFrontmatter } from "../daily-note.ts";
import { updateLinearApiDocument } from "../linear/project-documents-api.ts";
import { workoutDateKeyFromPath } from "../workouts/lib/workoutDays.ts";
import { normalizeVaultRelativePath } from "../vault-paths.ts";
import { ensureDocumentDateFrontmatter } from "./vault-frontmatter.ts";
import { readLinearDocumentIdFromVault } from "./linear-document-sync.ts";
import {
  hasWhoopMetrics,
  isDailyVaultNotePath,
  readWhoopStatsFromContent,
  resolveVaultNoteDate,
  toVaultNoteWhoopStats,
  type VaultNoteWhoopStats,
} from "./vault-whoop-stats.ts";

export type VaultDocumentContent = {
  path: string;
  title: string;
  body: string;
  frontmatter: string | null;
  date?: string | null;
  whoop?: VaultNoteWhoopStats | null;
};

function titleFromFilename(path: string): string {
  return basename(path, ".md");
}

function normalizeDocumentBody(body: string): string {
  const trimmed = body.trimEnd();
  return trimmed.length > 0 ? `${trimmed}\n` : "";
}

export function readVaultDocument(notesPath: string, relativePath: string): VaultDocumentContent {
  const path = normalizeVaultRelativePath(relativePath);
  if (!path.endsWith(".md")) {
    throw new Error("Document path must be a markdown file");
  }

  const abs = join(notesPath, path);
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    throw new Error("Document not found");
  }

  const raw = readFileSync(abs, "utf8");
  const { frontmatter, body } = splitFrontmatter(raw);
  const date = resolveVaultNoteDate(path, raw);
  let whoop: VaultNoteWhoopStats | null = null;

  if (isDailyVaultNotePath(path)) {
    const ownStats = readWhoopStatsFromContent(raw);
    whoop = ownStats;
    if (!whoop && date) {
      const dailyStats = readDailyNoteStats(notesPath, date);
      if (dailyStats && hasWhoopMetrics(dailyStats)) {
        whoop = toVaultNoteWhoopStats(dailyStats);
      }
    }
  }

  return {
    path,
    title: titleFromFilename(path),
    body,
    frontmatter,
    date,
    whoop,
  };
}

function sanitizeNoteFileBase(title: string): string {
  const cleaned = title
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Untitled";
}

function canRenameVaultDocumentByTitle(path: string, titleUpdated: boolean): boolean {
  if (!titleUpdated) return false;
  if (!path.endsWith(".md")) return false;
  if (isDailyVaultNotePath(path)) return false;
  if (workoutDateKeyFromPath(path)) return false;
  return true;
}

function resolveUniqueFileNameInDir(
  dirAbs: string,
  fileBase: string,
  excludeFileName?: string,
): string {
  let fileName = `${fileBase}.md`;
  let counter = 2;

  while (existsSync(join(dirAbs, fileName)) && fileName !== excludeFileName) {
    fileName = `${fileBase} ${counter}.md`;
    counter += 1;
  }

  return fileName;
}

function resolveRenamedVaultDocumentPath(
  notesPath: string,
  currentPath: string,
  nextTitle: string,
): string | null {
  if (!canRenameVaultDocumentByTitle(currentPath, true)) return null;

  const nextFileBase = sanitizeNoteFileBase(nextTitle);
  const currentFileBase = basename(currentPath, ".md");
  if (nextFileBase === currentFileBase) return null;

  const relativeDir = dirname(currentPath);
  const absDir = join(notesPath, relativeDir === "." ? "" : relativeDir);
  const currentFileName = basename(currentPath);
  const nextFileName = resolveUniqueFileNameInDir(absDir, nextFileBase, currentFileName);
  if (nextFileName === currentFileName) return null;

  return relativeDir === "." ? nextFileName : `${relativeDir}/${nextFileName}`;
}

export function createVaultDocument(
  notesPath: string,
  folderRelativePath: string,
  options?: { title?: string },
): VaultDocumentContent {
  const folder = normalizeVaultRelativePath(folderRelativePath);
  const absFolder = join(notesPath, folder);
  if (!existsSync(absFolder)) {
    mkdirSync(absFolder, { recursive: true });
  } else if (!statSync(absFolder).isDirectory()) {
    throw new Error("Target path is not a folder");
  }

  const title = options?.title?.trim() || "Untitled";
  const fileBase = sanitizeNoteFileBase(title);
  let fileName = `${fileBase}.md`;
  let counter = 2;
  while (existsSync(join(absFolder, fileName))) {
    fileName = `${fileBase} ${counter}.md`;
    counter += 1;
  }

  const relativePath = folder ? `${folder}/${fileName}` : fileName;
  const date = formatDateInTimezone(loadUserTimezone());
  const frontmatter = ensureDocumentDateFrontmatter(null, date);
  const content = joinFrontmatterAndBody(frontmatter, normalizeDocumentBody(""));
  writeFileSync(join(absFolder, fileName), content, "utf8");

  return readVaultDocument(notesPath, relativePath);
}

export async function updateVaultDocument(
  notesPath: string,
  relativePath: string,
  updates: { title?: string; body?: string },
): Promise<VaultDocumentContent> {
  const current = readVaultDocument(notesPath, relativePath);
  const nextTitle = updates.title !== undefined ? updates.title : current.title;
  const nextBody = updates.body !== undefined ? updates.body : current.body;
  const date = formatDateInTimezone(loadUserTimezone());
  const frontmatter = ensureDocumentDateFrontmatter(current.frontmatter, date);
  const content = joinFrontmatterAndBody(frontmatter, normalizeDocumentBody(nextBody));
  const nextPath =
    updates.title !== undefined
      ? resolveRenamedVaultDocumentPath(notesPath, current.path, nextTitle)
      : null;
  const currentAbs = join(notesPath, current.path);

  if (nextPath && nextPath !== current.path) {
    const nextAbs = join(notesPath, nextPath);
    writeFileSync(nextAbs, content, "utf8");
    unlinkSync(currentAbs);
  } else {
    writeFileSync(currentAbs, content, "utf8");
  }

  const savedPath = nextPath ?? current.path;

  const linearDocumentId = readLinearDocumentIdFromVault(notesPath, savedPath);
  if (linearDocumentId) {
    await updateLinearApiDocument(linearDocumentId, {
      title: nextTitle,
      content: nextBody,
    });
  }

  return readVaultDocument(notesPath, savedPath);
}
