import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { splitFrontmatter } from "../daily-note.ts";
import type { LinearApiDocument } from "../linear/project-documents-api.ts";
import { normalizeVaultRelativePath } from "../vault-paths.ts";
import type { ProjectDocumentRecord } from "./project-documents.ts";

const LINEAR_DOCUMENT_ID_FIELD = "linearDocumentId";

function parseFrontmatterFields(frontmatter: string): Map<string, string> {
  const fields = new Map<string, string>();
  const lines = frontmatter.split("\n");
  const closeIndex = lines.lastIndexOf("---");

  for (const line of lines.slice(1, closeIndex)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) {
      fields.set(match[1]!, match[2] ?? "");
    }
  }

  return fields;
}

function unquoteYamlValue(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function escapeYamlString(value: string): string {
  return value.replace(/"/g, '\\"');
}

function sanitizeFileName(title: string): string {
  const cleaned = title
    .replace(/[:/\\*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Untitled note";
}

function formatIsoDate(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return new Date().toISOString().slice(0, 19);
  }
  return new Date(parsed).toISOString().slice(0, 19);
}

function bodyWithTitle(title: string, body: string): string {
  const trimmedTitle = title.trim() || "Untitled";
  const trimmedBody = body.trimEnd();
  if (!trimmedBody) {
    return `# ${trimmedTitle}\n`;
  }
  return `# ${trimmedTitle}\n\n${trimmedBody}\n`;
}

function buildSyncedNoteFrontmatter(options: {
  linearDocumentId: string;
  projectName: string;
  date: string;
}): string {
  return `---
category: Note
date: "${formatIsoDate(options.date)}"
linearDocumentId: "${escapeYamlString(options.linearDocumentId)}"
project: "${escapeYamlString(options.projectName)}"
status: Inbox
owner: []
tags: []
type: note
---

`;
}

function listProjectFolderPaths(
  notesPath: string,
  teamId: string,
  projectId: string,
): string[] {
  const relativeDir = `Organizations/${teamId}/${projectId}`;
  const absDir = join(notesPath, relativeDir);
  if (!existsSync(absDir) || !statSync(absDir).isDirectory()) {
    return [];
  }

  const results: string[] = [];
  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || !entry.isFile() || !entry.name.endsWith(".md")) {
      continue;
    }
    results.push(normalizeVaultRelativePath(join(relativeDir, entry.name).replace(/\\/g, "/")));
  }
  return results;
}

export function findVaultPathByLinearDocumentId(
  notesPath: string,
  teamId: string,
  projectId: string,
  linearDocumentId: string,
): string | null {
  for (const path of listProjectFolderPaths(notesPath, teamId, projectId)) {
    const abs = join(notesPath, path);
    const content = readFileSync(abs, "utf8");
    const { frontmatter } = splitFrontmatter(content);
    if (!frontmatter) continue;

    const fields = parseFrontmatterFields(frontmatter);
    const id = unquoteYamlValue(fields.get(LINEAR_DOCUMENT_ID_FIELD) ?? "");
    if (id === linearDocumentId) {
      return path;
    }
  }

  return null;
}

export function readLinearDocumentIdFromVault(
  notesPath: string,
  relativePath: string,
): string | null {
  const abs = join(notesPath, relativePath);
  if (!existsSync(abs)) return null;

  const content = readFileSync(abs, "utf8");
  const { frontmatter } = splitFrontmatter(content);
  if (!frontmatter) return null;

  const fields = parseFrontmatterFields(frontmatter);
  const id = unquoteYamlValue(fields.get(LINEAR_DOCUMENT_ID_FIELD) ?? "");
  return id || null;
}

function getUniqueFilePath(directoryAbs: string, baseFileName: string): string {
  const ext = ".md";
  const base = baseFileName.endsWith(ext) ? baseFileName.slice(0, -ext.length) : baseFileName;
  let candidate = join(directoryAbs, `${base}${ext}`);
  if (!existsSync(candidate)) return candidate;

  let index = 2;
  while (existsSync(join(directoryAbs, `${base} ${index}${ext}`))) {
    index += 1;
  }
  return join(directoryAbs, `${base} ${index}${ext}`);
}

export function upsertLinearDocumentInVault(
  notesPath: string,
  teamId: string,
  projectId: string,
  projectName: string,
  document: LinearApiDocument,
): string {
  const folderRelative = `Organizations/${teamId}/${projectId}`;
  const folderAbs = join(notesPath, folderRelative);
  mkdirSync(folderAbs, { recursive: true });

  const existingPath = findVaultPathByLinearDocumentId(
    notesPath,
    teamId,
    projectId,
    document.id,
  );

  const absPath = existingPath
    ? join(notesPath, existingPath)
    : getUniqueFilePath(folderAbs, `${sanitizeFileName(document.title)}.md`);

  const relativePath = normalizeVaultRelativePath(
    existingPath ?? absPath.slice(notesPath.length + 1),
  );

  const content =
    buildSyncedNoteFrontmatter({
      linearDocumentId: document.id,
      projectName,
      date: document.updatedAt || document.createdAt,
    }) + bodyWithTitle(document.title, document.content);

  writeFileSync(join(notesPath, relativePath), content, "utf8");
  return relativePath;
}

export function syncLinearDocumentsToVault(
  notesPath: string,
  teamId: string,
  projectId: string,
  projectName: string,
  documents: LinearApiDocument[],
): string[] {
  return documents.map((document) =>
    upsertLinearDocumentInVault(notesPath, teamId, projectId, projectName, document),
  );
}

/** Removes legacy local-only project notes created before Linear sync (no linearDocumentId). */
export function removeLocalOnlyProjectDocuments(
  notesPath: string,
  teamId: string,
  projectId: string,
): string[] {
  const removed: string[] = [];

  for (const path of listProjectFolderPaths(notesPath, teamId, projectId)) {
    const linearId = readLinearDocumentIdFromVault(notesPath, path);
    if (linearId) continue;

    const abs = join(notesPath, path);
    if (!existsSync(abs)) continue;

    unlinkSync(abs);
    removed.push(path);
  }

  return removed;
}

export function vaultBodyForLinearUpdate(title: string, body: string): string {
  const trimmedTitle = title.trim() || "Untitled";
  const trimmedBody = body.trimEnd();
  return trimmedBody ? `# ${trimmedTitle}\n\n${trimmedBody}` : `# ${trimmedTitle}`;
}

export function linearContentFromVaultTitleBody(title: string, body: string): string {
  return vaultBodyForLinearUpdate(title, body).replace(/^#\s+.+\n?/, "").trim();
}

export type { ProjectDocumentRecord };
