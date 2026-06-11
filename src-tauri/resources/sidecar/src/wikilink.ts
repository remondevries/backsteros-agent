import { basename, dirname, join } from "node:path";
import { listVaultFiles, vaultFileExists } from "./vault-files.ts";

export interface ParsedWikilinkTarget {
  target: string;
  alias?: string;
  heading?: string;
}

export interface ResolvedWikilink {
  path: string;
  heading?: string;
}

export interface AmbiguousWikilink {
  candidates: string[];
}

export type WikilinkResolution = ResolvedWikilink | AmbiguousWikilink;

export function parseWikilinkTarget(raw: string): ParsedWikilinkTarget {
  const trimmed = raw.trim();
  const aliasSeparator = trimmed.indexOf("|");
  const targetPart =
    aliasSeparator >= 0 ? trimmed.slice(0, aliasSeparator).trim() : trimmed;
  const alias =
    aliasSeparator >= 0 ? trimmed.slice(aliasSeparator + 1).trim() || undefined : undefined;

  const blockSeparator = targetPart.indexOf("^");
  const withoutBlock = blockSeparator >= 0 ? targetPart.slice(0, blockSeparator).trim() : targetPart;

  const headingSeparator = withoutBlock.indexOf("#");
  const target =
    headingSeparator >= 0 ? withoutBlock.slice(0, headingSeparator).trim() : withoutBlock;
  const heading =
    headingSeparator >= 0 ? withoutBlock.slice(headingSeparator + 1).trim() || undefined : undefined;

  return { target, alias, heading };
}

function normalizeVaultRelativePath(target: string): string {
  const normalized = target.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) {
    throw new Error("Wikilink target is empty");
  }
  return normalized.endsWith(".md") ? normalized : `${normalized}.md`;
}

function fileExistsInVault(notesPath: string, vaultRelativePath: string): boolean {
  return vaultFileExists(notesPath, vaultRelativePath);
}

function listMarkdownFiles(notesPath: string): string[] {
  return listVaultFiles(notesPath).filter((path) => path.endsWith(".md"));
}

function stemMatchesTarget(stem: string, target: string): boolean {
  return stem.localeCompare(target, undefined, { sensitivity: "accent" }) === 0;
}

function resolveByTitle(
  notesPath: string,
  title: string,
  fromPath?: string,
): WikilinkResolution | null {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) {
    return null;
  }

  if (fromPath) {
    const sibling = join(dirname(fromPath), `${normalizedTitle}.md`).replace(/\\/g, "/");
    if (fileExistsInVault(notesPath, sibling)) {
      return { path: sibling };
    }
  }

  const matches = listMarkdownFiles(notesPath).filter((path) =>
    stemMatchesTarget(basename(path, ".md"), normalizedTitle),
  );

  if (matches.length === 1) {
    return { path: matches[0]! };
  }
  if (matches.length > 1) {
    return { candidates: matches.sort() };
  }
  return null;
}

export function resolveWikilink(
  notesPath: string,
  rawLink: string,
  fromPath?: string,
): WikilinkResolution {
  const parsed = parseWikilinkTarget(rawLink);
  if (!parsed.target) {
    throw new Error("Wikilink target is empty");
  }

  const hasPathHint = parsed.target.includes("/") || parsed.target.endsWith(".md");
  let resolution: WikilinkResolution | null = null;

  if (hasPathHint) {
    const path = normalizeVaultRelativePath(parsed.target);
    if (fileExistsInVault(notesPath, path)) {
      resolution = { path };
    }
  } else {
    resolution = resolveByTitle(notesPath, parsed.target, fromPath);
  }

  if (!resolution) {
    throw new Error(`No note found for wikilink: ${parsed.target}`);
  }

  if ("candidates" in resolution) {
    return resolution;
  }

  return parsed.heading ? { ...resolution, heading: parsed.heading } : resolution;
}

export function formatWikilinkResolution(result: WikilinkResolution): string {
  if ("candidates" in result) {
    const lines = result.candidates.map((candidate) => `- ${candidate}`);
    return [`ambiguous: ${result.candidates.length} matches`, ...lines].join("\n");
  }

  const lines = [`path: ${result.path}`];
  if (result.heading) {
    lines.push(`heading: ${result.heading}`);
  }
  return lines.join("\n");
}
