import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parseNameFromProfileContent } from "./context/profile.ts";
import { readCachedFileContent } from "./context/cache.ts";
import { getUserProfilePath } from "./config.ts";

export const LETTERS_FOLDER = "Letters";

export const LETTER_STATUS_ORDER = ["Inbox", "In Progress", "On Hold", "Archived"] as const;

export type LetterStatus = (typeof LETTER_STATUS_ORDER)[number];

export interface LetterFilingMetadata {
  assigned?: string;
  creator: string;
  organization: string;
  date: string;
  status: string;
  project?: string;
  note?: string;
}

export interface LetterFilingResult {
  pdfPath: string;
  wrapperPath: string;
  pdfFileName: string;
}

function resolveWorkspacePath(notesPath: string, targetPath: string): string {
  const abs = join(notesPath, targetPath);
  const rel = relative(notesPath, abs);
  if (rel.startsWith("..") || rel === "..") {
    throw new Error("Path must stay inside the notes workspace");
  }
  return abs;
}

function normalizeVaultPath(path: string): string {
  return path.replace(/\\/g, "/");
}

function splitExtension(name: string): { stem: string; extension: string } {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return { stem: name, extension: "" };
  return {
    stem: name.slice(0, dot),
    extension: name.slice(dot),
  };
}

function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "letter.pdf";
  const cleaned = base.replace(/[^\w.\-() ]+/g, "_").trim();
  return cleaned || "letter.pdf";
}

export function resolveLetterStatus(status: string | undefined): LetterStatus {
  const value = status?.trim() ?? "";
  if (!value) return "Inbox";
  if (value.toLowerCase() === "archive") return "Archived";
  for (const option of LETTER_STATUS_ORDER) {
    if (option.toLowerCase() === value.toLowerCase()) return option;
  }
  return "Inbox";
}

export function yamlQuotedString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function yamlNoteValue(note: string): string {
  if (
    !note.includes("\n") &&
    !note.includes(":") &&
    !note.includes("#") &&
    !note.startsWith('"') &&
    !note.startsWith("'")
  ) {
    return note;
  }
  return yamlQuotedString(note);
}

function loadAssignedName(): string {
  const content = readCachedFileContent(getUserProfilePath());
  if (!content) return "Remon de Vries";
  return parseNameFromProfileContent(content)?.trim() || "Remon de Vries";
}

function buildEmbed(attachmentName: string): string {
  return `![[${attachmentName}]]`;
}

export function buildLetterWrapperContent(
  pdfFileName: string,
  metadata: LetterFilingMetadata,
): string {
  const status = resolveLetterStatus(metadata.status);
  const date = metadata.date.trim();
  const project = metadata.project?.trim() ?? "";
  const organization = metadata.organization.trim();
  const note = metadata.note?.trim() ?? "";
  const assigned = metadata.assigned?.trim() || loadAssignedName();

  const lines = [
    "---",
    "type: letter",
    `assigned: ${yamlQuotedString(assigned)}`,
    `date: ${date ? yamlQuotedString(date) : '""'}`,
    `organization: ${organization ? yamlQuotedString(organization) : '""'}`,
    `project: ${project ? yamlQuotedString(project) : '""'}`,
    `status: ${yamlQuotedString(status)}`,
  ];

  if (note) {
    lines.push(`note: ${yamlNoteValue(note)}`);
  }

  lines.push("---", "", buildEmbed(pdfFileName));

  return lines.join("\n");
}

function getUniqueVaultPath(notesPath: string, basePath: string): string {
  const normalized = normalizeVaultPath(basePath);
  const abs = resolveWorkspacePath(notesPath, normalized);
  if (!existsSync(abs)) return normalized;

  const slash = normalized.lastIndexOf("/");
  const folder = slash >= 0 ? normalized.slice(0, slash) : "";
  const fileName = slash >= 0 ? normalized.slice(slash + 1) : normalized;
  const { stem, extension } = splitExtension(fileName);

  let counter = 2;
  let candidate = normalized;
  while (existsSync(resolveWorkspacePath(notesPath, candidate))) {
    candidate = normalizeVaultPath(
      `${folder ? `${folder}/` : ""}${stem} ${counter}${extension}`,
    );
    counter += 1;
  }
  return candidate;
}

function preferredPdfFileName(originalName: string, metadata: LetterFilingMetadata): string {
  const sanitized = sanitizeFileName(originalName);
  const { stem, extension } = splitExtension(sanitized);
  const ext = extension.toLowerCase() === ".pdf" ? extension : ".pdf";
  const date = metadata.date.trim();
  const label =
    metadata.organization.trim() ||
    metadata.creator.trim() ||
    stem.replace(/^\d{4}-\d{2}-\d{2}\s*-\s*/, "").trim() ||
    "Letter";

  const safeLabel = label.replace(/[^\w.\-() ]+/g, "_").trim() || "Letter";
  if (date && !stem.startsWith(date)) {
    return `${date} - ${safeLabel}${ext}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(stem)) {
    return `${stem}${ext}`;
  }
  return `${safeLabel}${ext}`;
}

function preferredWrapperPath(pdfPath: string): string {
  const fileName = pdfPath.split("/").pop() ?? "letter.pdf";
  const { stem } = splitExtension(fileName);
  return normalizeVaultPath(`${LETTERS_FOLDER}/${stem}.md`);
}

export function fileLetterInVault(
  notesPath: string,
  stagedPdfPath: string,
  originalName: string,
  metadata: LetterFilingMetadata,
): LetterFilingResult {
  const stagedAbs = resolveWorkspacePath(notesPath, stagedPdfPath);
  if (!existsSync(stagedAbs)) {
    throw new Error(`Staged PDF not found at ${stagedPdfPath}`);
  }

  const lettersAbs = resolveWorkspacePath(notesPath, LETTERS_FOLDER);
  mkdirSync(lettersAbs, { recursive: true });

  const pdfFileName = preferredPdfFileName(originalName, metadata);
  const pdfPath = getUniqueVaultPath(
    notesPath,
    normalizeVaultPath(`${LETTERS_FOLDER}/${pdfFileName}`),
  );
  const pdfAbs = resolveWorkspacePath(notesPath, pdfPath);
  copyFileSync(stagedAbs, pdfAbs);

  const finalPdfFileName = pdfPath.split("/").pop() ?? pdfFileName;
  const wrapperPath = preferredWrapperPath(pdfPath);
  const wrapperAbs = resolveWorkspacePath(notesPath, wrapperPath);

  writeFileSync(
    wrapperAbs,
    buildLetterWrapperContent(finalPdfFileName, metadata),
    "utf8",
  );

  try {
    unlinkSync(stagedAbs);
  } catch {
    // Staged attachment cleanup is best-effort.
  }

  return {
    pdfPath,
    wrapperPath,
    pdfFileName: finalPdfFileName,
  };
}

export function readPdfBufferFromVault(notesPath: string, vaultPath: string): Buffer {
  const abs = resolveWorkspacePath(notesPath, vaultPath);
  return readFileSync(abs);
}

export function isPdfAttachment(name: string, mimeType: string): boolean {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return true;
  return mimeType.trim().toLowerCase() === "application/pdf";
}
