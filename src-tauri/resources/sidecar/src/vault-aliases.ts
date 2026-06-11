import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { joinFrontmatterAndBody, splitFrontmatter } from "./daily-note.ts";
import {
  CONTACTS_FOLDER,
  ORGANIZATIONS_FOLDER,
  PROJECTS_FOLDER,
} from "./letter-options.ts";
import type { LetterFilingMetadata } from "./letter-filing.ts";

export type VaultEntityKind = "contact" | "organization" | "project";

function resolveWorkspacePath(notesPath: string, targetPath: string): string {
  const abs = join(notesPath, targetPath);
  const rel = relative(notesPath, abs);
  if (rel.startsWith("..") || rel === "..") {
    throw new Error("Path must stay inside the notes workspace");
  }
  return abs;
}

function normalizeAlias(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function aliasKey(value: string): string {
  return normalizeAlias(value).toLowerCase();
}

export function dedupeAliases(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = normalizeAlias(value);
    if (!normalized) continue;
    const key = aliasKey(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

export function parseAliasListFromFrontmatter(frontmatter: string | null): string[] {
  if (!frontmatter) return [];

  const lines = frontmatter.split("\n");
  const closeIndex = lines.lastIndexOf("---");
  const aliases: string[] = [];
  let inAliasBlock = false;

  for (const line of lines.slice(1, closeIndex)) {
    const trimmed = line.trim();
    if (/^alias:\s*$/.test(trimmed)) {
      inAliasBlock = true;
      continue;
    }
    if (/^alias:\s*(.+)$/.test(trimmed)) {
      const inline = trimmed.replace(/^alias:\s*/, "").trim();
      if (inline.startsWith("[") && inline.endsWith("]")) {
        const inner = inline.slice(1, -1);
        for (const part of inner.split(",")) {
          const cleaned = part.trim().replace(/^["']|["']$/g, "");
          if (cleaned) aliases.push(cleaned);
        }
      } else {
        aliases.push(inline.replace(/^["']|["']$/g, ""));
      }
      inAliasBlock = false;
      continue;
    }
    if (inAliasBlock && trimmed.startsWith("- ")) {
      aliases.push(trimmed.slice(2).trim().replace(/^["']|["']$/g, ""));
      continue;
    }
    if (inAliasBlock && trimmed.length > 0 && !trimmed.startsWith("-")) {
      inAliasBlock = false;
    }
  }

  return dedupeAliases(aliases);
}

export function formatAliasFrontmatter(aliases: string[]): string {
  const unique = dedupeAliases(aliases);
  if (unique.length === 0) {
    return "---\n---";
  }
  const lines = ["---", "alias:"];
  for (const alias of unique) {
    lines.push(`  - ${JSON.stringify(alias).slice(1, -1)}`);
  }
  lines.push("---");
  return lines.join("\n");
}

export function readAliasesFromNote(absPath: string): string[] {
  if (!existsSync(absPath) || !statSync(absPath).isFile()) {
    return [];
  }
  const content = readFileSync(absPath, "utf8");
  const { frontmatter } = splitFrontmatter(content);
  return parseAliasListFromFrontmatter(frontmatter);
}

export function appendAliasesToNote(absPath: string, newAliases: string[]): void {
  const additions = dedupeAliases(newAliases);
  if (additions.length === 0) return;

  const existingContent = existsSync(absPath) ? readFileSync(absPath, "utf8") : "";
  const { frontmatter, body } = splitFrontmatter(existingContent);
  const merged = dedupeAliases([...parseAliasListFromFrontmatter(frontmatter), ...additions]);
  const next = joinFrontmatterAndBody(formatAliasFrontmatter(merged), body);
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, next, "utf8");
}

export function resolveContactNotePath(notesPath: string, name: string): string {
  return resolveWorkspacePath(notesPath, join(CONTACTS_FOLDER, `${name}.md`));
}

export function resolveOrganizationNotePath(notesPath: string, name: string): string {
  return resolveWorkspacePath(notesPath, join(ORGANIZATIONS_FOLDER, `${name}.md`));
}

export function resolveProjectNotePath(notesPath: string, name: string): string | null {
  const folderPath = resolveWorkspacePath(notesPath, join(PROJECTS_FOLDER, name));
  const nested = join(folderPath, `${name}.md`);
  if (existsSync(nested) && statSync(nested).isFile()) {
    return nested;
  }

  if (existsSync(folderPath) && statSync(folderPath).isDirectory()) {
    const mdFiles = readdirSync(folderPath)
      .filter((entry) => entry.toLowerCase().endsWith(".md") && entry !== "_index.md")
      .sort((left, right) => left.localeCompare(right));
    if (mdFiles[0]) {
      return join(folderPath, mdFiles[0]);
    }
  }

  const flat = resolveWorkspacePath(notesPath, join(PROJECTS_FOLDER, `${name}.md`));
  if (existsSync(flat) && statSync(flat).isFile()) {
    return flat;
  }

  return nested;
}

export function ensureEntityNote(
  notesPath: string,
  kind: VaultEntityKind,
  canonicalName: string,
): string {
  const name = canonicalName.trim();
  if (!name) {
    throw new Error("Canonical entity name is required");
  }

  let absPath: string;
  if (kind === "contact") {
    absPath = resolveContactNotePath(notesPath, name);
  } else if (kind === "organization") {
    absPath = resolveOrganizationNotePath(notesPath, name);
  } else {
    absPath = resolveProjectNotePath(notesPath, name) ?? join(
      resolveWorkspacePath(notesPath, join(PROJECTS_FOLDER, name)),
      `${name}.md`,
    );
  }

  mkdirSync(dirname(absPath), { recursive: true });

  if (!existsSync(absPath)) {
    writeFileSync(absPath, `${formatAliasFrontmatter([])}\n`, "utf8");
  }

  return absPath;
}

export interface LetterMatchSources {
  assigned?: string;
  organization?: string;
  project?: string;
}

export function recordLearnedAliases({
  notesPath,
  metadata,
  matchSources,
}: {
  notesPath: string;
  metadata: LetterFilingMetadata;
  matchSources: LetterMatchSources;
}): void {
  const assigned = metadata.assigned?.trim();
  if (assigned) {
    ensureEntityNote(notesPath, "contact", assigned);
    if (matchSources.assigned) {
      const raw = normalizeAlias(matchSources.assigned);
      if (raw && aliasKey(raw) !== aliasKey(assigned)) {
        appendAliasesToNote(resolveContactNotePath(notesPath, assigned), [raw]);
      }
    }
  }

  const organization = metadata.organization.trim();
  if (organization) {
    ensureEntityNote(notesPath, "organization", organization);
    if (matchSources.organization) {
      const raw = normalizeAlias(matchSources.organization);
      if (raw && aliasKey(raw) !== aliasKey(organization)) {
        appendAliasesToNote(resolveOrganizationNotePath(notesPath, organization), [raw]);
      }
    }
  }

  const project = metadata.project?.trim();
  if (project) {
    ensureEntityNote(notesPath, "project", project);
    if (matchSources.project) {
      const raw = normalizeAlias(matchSources.project);
      if (raw && aliasKey(raw) !== aliasKey(project)) {
        const path = resolveProjectNotePath(notesPath, project);
        if (path) appendAliasesToNote(path, [raw]);
      }
    }
  }
}
