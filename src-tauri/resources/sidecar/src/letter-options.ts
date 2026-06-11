import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const CONTACTS_FOLDER = "Contacts";
export const ORGANIZATIONS_FOLDER = "Organizations";
export const PROJECTS_FOLDER = "Projects";

export const LETTER_FILING_STATUS_OPTIONS = [
  "Inbox",
  "In Progress",
  "On Hold",
  "Archive",
] as const;

export type LetterFilingStatusOption = (typeof LETTER_FILING_STATUS_OPTIONS)[number];

export interface LetterFilingOptions {
  contacts: string[];
  organizations: string[];
  projects: string[];
  statuses: LetterFilingStatusOption[];
}

function listMarkdownStemNames(notesPath: string, folder: string): string[] {
  const dir = join(notesPath, folder);
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.toLowerCase().endsWith(".md") &&
        entry.name !== "_index.md",
    )
    .map((entry) => entry.name.replace(/\.md$/i, ""))
    .sort((left, right) => left.localeCompare(right));
}

function listProjectFolderNames(notesPath: string): string[] {
  const dir = join(notesPath, PROJECTS_FOLDER);
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

export function getLetterFilingOptions(notesPath: string): LetterFilingOptions {
  return {
    contacts: listMarkdownStemNames(notesPath, CONTACTS_FOLDER),
    organizations: listMarkdownStemNames(notesPath, ORGANIZATIONS_FOLDER),
    projects: listProjectFolderNames(notesPath),
    statuses: [...LETTER_FILING_STATUS_OPTIONS],
  };
}
