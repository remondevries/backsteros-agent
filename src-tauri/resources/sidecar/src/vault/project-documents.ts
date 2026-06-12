import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { linearGraphqlRequest } from "../linear/graphql.ts";
import { splitFrontmatter } from "../daily-note.ts";
import { listVaultFiles } from "../vault-files.ts";
import { normalizeVaultRelativePath, shouldSkipVaultDirectory } from "../vault-paths.ts";
import { debugLog } from "../debug-log.ts";
import {
  createLinearApiDocument,
  fetchLinearApiProjectDocuments,
} from "../linear/project-documents-api.ts";
import {
  syncLinearDocumentsToVault,
  upsertLinearDocumentInVault,
} from "./linear-document-sync.ts";

export type ProjectDocumentRecord = {
  id: string;
  path: string;
  title: string;
  status: string;
  statusGroup: "Inbox" | "In Progress" | "On Hold" | "Archived";
  organization: string;
  owner: string;
  category: string;
  date: string | null;
};

const DOCUMENT_STATUS_ORDER = ["Inbox", "In Progress", "On Hold", "Archived"] as const;

type DocumentStatusGroup = (typeof DOCUMENT_STATUS_ORDER)[number];

function normalizeForFolderMatch(name: string): string {
  return name.replace(/[:/\\*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
}

function getDocumentStatusGroup(status: unknown): DocumentStatusGroup {
  const value = typeof status === "string" ? status.trim() : "";
  if (!value) return "Inbox";

  const lower = value.toLowerCase();
  if (lower === "concept" || lower === "triage") return "Inbox";
  if (lower === "archive" || lower === "archived") return "Archived";

  for (const option of DOCUMENT_STATUS_ORDER) {
    if (option.toLowerCase() === lower) return option;
  }

  return "Inbox";
}

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

function organizationFromFrontmatter(fields: Map<string, string>): string {
  const organization = unquoteYamlValue(fields.get("organization") ?? "");
  if (organization) return organization;

  const organizations = unquoteYamlValue(fields.get("organizations") ?? "");
  if (!organizations) return "";

  if (organizations.startsWith("[") && organizations.endsWith("]")) {
    const inner = organizations.slice(1, -1).trim();
    const first = inner.split(",")[0]?.trim() ?? "";
    return unquoteYamlValue(first);
  }

  return organizations;
}

function titleFromMarkdown(path: string, body: string): string {
  for (const line of body.split("\n")) {
    const match = /^#\s+(.+)$/.exec(line.trim());
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return basename(path, ".md");
}

function isTechnicalNotePath(path: string): boolean {
  return basename(path).startsWith("_");
}

function readDocumentRecord(notesPath: string, relativePath: string): ProjectDocumentRecord | null {
  if (!relativePath.endsWith(".md") || isTechnicalNotePath(relativePath)) {
    return null;
  }

  const abs = join(notesPath, relativePath);
  if (!existsSync(abs) || !statSync(abs).isFile()) return null;

  const content = readFileSync(abs, "utf8");
  const { frontmatter, body } = splitFrontmatter(content);
  if (!frontmatter) return null;

  const fields = parseFrontmatterFields(frontmatter);
  const type = unquoteYamlValue(fields.get("type") ?? "").toLowerCase();
  if (type !== "note") return null;

  const status = unquoteYamlValue(fields.get("status") ?? "");
  const owner = unquoteYamlValue(fields.get("owner") ?? fields.get("author") ?? "");
  const category = unquoteYamlValue(fields.get("category") ?? "");
  const dateRaw = unquoteYamlValue(fields.get("date") ?? "");
  const path = normalizeVaultRelativePath(relativePath);

  return {
    id: path,
    path,
    title: titleFromMarkdown(path, body),
    status,
    statusGroup: getDocumentStatusGroup(status),
    organization: organizationFromFrontmatter(fields),
    owner,
    category,
    date: dateRaw || null,
  };
}

function listMarkdownFilesInDirectory(notesPath: string, relativeDir: string): string[] {
  const absDir = join(notesPath, relativeDir);
  if (!existsSync(absDir) || !statSync(absDir).isDirectory()) {
    return [];
  }

  const results: string[] = [];
  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const relativePath = join(relativeDir, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) continue;
    if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(relativePath);
    }
  }

  return results;
}

function listMarkdownFilesRecursively(notesPath: string, relativeDir: string): string[] {
  const absDir = join(notesPath, relativeDir);
  if (!existsSync(absDir) || !statSync(absDir).isDirectory()) {
    return [];
  }

  const results: string[] = [];

  const walk = (currentRelative: string) => {
    const currentAbs = join(notesPath, currentRelative);
    for (const entry of readdirSync(currentAbs, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      if (entry.isDirectory()) {
        if (shouldSkipVaultDirectory(entry.name)) continue;
        walk(join(currentRelative, entry.name).replace(/\\/g, "/"));
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".md")) {
        results.push(join(currentRelative, entry.name).replace(/\\/g, "/"));
      }
    }
  };

  walk(relativeDir);
  return results;
}

async function resolveProjectContext(projectId: string): Promise<{
  projectName: string;
  teamId: string | null;
}> {
  const data = await linearGraphqlRequest<{
    project?: {
      name?: string | null;
      teams?: { nodes?: Array<{ id?: string | null } | null> | null } | null;
    } | null;
  }>(
    `
      query BacksterProjectDocumentsContext($id: String!) {
        project(id: $id) {
          name
          teams(first: 1) {
            nodes { id }
          }
        }
      }
    `,
    { id: projectId },
  );

  const projectName = (data.project?.name ?? "").trim();
  const teamId = data.project?.teams?.nodes?.[0]?.id?.trim() ?? null;
  return { projectName, teamId };
}

function compareDocumentsNewestFirst(left: ProjectDocumentRecord, right: ProjectDocumentRecord): number {
  const leftTime = left.date ? new Date(left.date).getTime() : 0;
  const rightTime = right.date ? new Date(right.date).getTime() : 0;
  const safeLeft = Number.isFinite(leftTime) ? leftTime : 0;
  const safeRight = Number.isFinite(rightTime) ? rightTime : 0;
  return safeRight - safeLeft || right.path.localeCompare(left.path);
}

function mergeDocuments(records: ProjectDocumentRecord[]): ProjectDocumentRecord[] {
  const byPath = new Map<string, ProjectDocumentRecord>();
  for (const record of records) {
    byPath.set(record.path, record);
  }
  return [...byPath.values()].sort(compareDocumentsNewestFirst);
}

function listLinkedInboxDocuments(
  notesPath: string,
  projectName: string,
): ProjectDocumentRecord[] {
  const normalizedProject = normalizeForFolderMatch(projectName);
  if (!normalizedProject) return [];

  const records: ProjectDocumentRecord[] = [];
  for (const path of listVaultFiles(notesPath)) {
    if (!path.startsWith("Inbox/")) continue;
    if (isTechnicalNotePath(path)) continue;

    const abs = join(notesPath, path);
    if (!existsSync(abs)) continue;

    const content = readFileSync(abs, "utf8");
    const { frontmatter } = splitFrontmatter(content);
    if (!frontmatter) continue;

    const fields = parseFrontmatterFields(frontmatter);
    const fileProject = normalizeForFolderMatch(unquoteYamlValue(fields.get("project") ?? ""));
    if (!fileProject || fileProject !== normalizedProject) continue;

    const record = readDocumentRecord(notesPath, path);
    if (record) records.push(record);
  }

  return records;
}

export async function fetchLinearProjectDocuments(
  notesPath: string,
  projectId: string,
): Promise<ProjectDocumentRecord[]> {
  const id = projectId.trim();
  if (!id) return [];

  const { projectName, teamId } = await resolveProjectContext(id);
  let linearCount = 0;

  if (teamId) {
    try {
      const linearDocuments = await fetchLinearApiProjectDocuments(id);
      linearCount = linearDocuments.length;
      syncLinearDocumentsToVault(notesPath, teamId, id, projectName || "Untitled Project", linearDocuments);
    } catch (error) {
      // #region agent log
      debugLog(
        "project-documents.ts:fetchLinearProjectDocuments",
        "Linear document sync failed; falling back to local vault scan",
        {
          projectId: id,
          teamId,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        "H2",
      );
      // #endregion
    }
  }

  const records: ProjectDocumentRecord[] = [];

  if (teamId) {
    const projectFolder = `Organizations/${teamId}/${id}`;
    for (const path of listMarkdownFilesInDirectory(notesPath, projectFolder)) {
      const record = readDocumentRecord(notesPath, path);
      if (record) records.push(record);
    }
  }

  if (projectName) {
    records.push(...listLinkedInboxDocuments(notesPath, projectName));
  }

  const merged = mergeDocuments(records);
  // #region agent log
  debugLog(
    "project-documents.ts:fetchLinearProjectDocuments",
    "Fetched project documents with Linear sync",
    {
      projectId: id,
      teamId,
      projectName,
      linearCount,
      localCount: merged.length,
      linearApiCalled: true,
      notesPath,
    },
    "H2",
  );
  // #endregion
  return merged;
}

export async function fetchLinearTeamDocuments(
  notesPath: string,
  teamId: string,
): Promise<ProjectDocumentRecord[]> {
  const id = teamId.trim();
  if (!id) return [];

  const records: ProjectDocumentRecord[] = [];
  const teamFolder = `Organizations/${id}`;

  for (const path of listMarkdownFilesRecursively(notesPath, teamFolder)) {
    const record = readDocumentRecord(notesPath, path);
    if (record) records.push(record);
  }

  return mergeDocuments(records);
}

export async function createProjectDocument(
  notesPath: string,
  projectId: string,
): Promise<ProjectDocumentRecord> {
  const id = projectId.trim();
  if (!id) {
    throw new Error("projectId is required");
  }

  const { projectName, teamId } = await resolveProjectContext(id);
  if (!teamId) {
    throw new Error("Could not resolve Linear team for this project");
  }

  const linearDocument = await createLinearApiDocument(id, "Untitled note", "");
  const relativePath = upsertLinearDocumentInVault(
    notesPath,
    teamId,
    id,
    projectName || "Untitled Project",
    linearDocument,
  );

  const record = readDocumentRecord(notesPath, relativePath);
  if (!record) {
    throw new Error("Failed to read created document");
  }
  // #region agent log
  debugLog(
    "project-documents.ts:createProjectDocument",
    "Created Linear document and mirrored to vault",
    {
      projectId: id,
      teamId,
      path: relativePath,
      linearDocumentId: linearDocument.id,
      linearApiCalled: true,
    },
    "H3",
  );
  // #endregion
  return record;
}
