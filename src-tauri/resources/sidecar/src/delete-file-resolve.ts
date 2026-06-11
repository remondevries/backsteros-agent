import { basename } from "node:path";
import { resolveWikilink } from "./wikilink.ts";
import {
  buildVaultPathIndex,
  canonicalVaultPath,
  listVaultFiles,
} from "./vault-files.ts";

export type DeleteTargetResolution =
  | { status: "found"; path: string }
  | { status: "ambiguous"; candidates: string[] }
  | { status: "not_found" };

function normalizeQuery(text: string): string {
  return text
    .replace(/\[\[([^\]]+)\]\]/g, " $1 ")
    .replace(/\b(delete|remove|trash|erase|drop|unlink)\b/gi, " ")
    .replace(/\b(the|a|an|my|this|that|please|from|in|vault|obsidian|note|file|files)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractWikilinks(text: string): string[] {
  const links: string[] = [];
  for (const match of text.matchAll(/\[\[([^\]]+)\]\]/g)) {
    links.push(match[1]!.trim());
  }
  return links;
}

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths.map((path) => path.replace(/\\/g, "/")))];
}

function uniqueCanonicalPaths(
  vaultIndex: Map<string, string>,
  paths: string[],
): string[] {
  const seen = new Set<string>();
  const canonicalPaths: string[] = [];

  for (const path of paths) {
    const canonical = canonicalVaultPath(vaultIndex, path);
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    canonicalPaths.push(canonical);
  }

  return canonicalPaths;
}

const FILENAME_WITH_EXT_RE =
  /([A-Za-z0-9][A-Za-z0-9 _.-]*\.(?:md|pdf|txt|csv|json))/gi;
const VAULT_PATH_WITH_EXT_RE =
  /([A-Za-z0-9][A-Za-z0-9 _.-]*(?:\/[A-Za-z0-9][A-Za-z0-9 _.-]*)+\.(?:md|pdf|txt|csv|json))/gi;

function extractBasenameTokens(text: string): string[] {
  const tokens: string[] = [];
  for (const match of text.matchAll(VAULT_PATH_WITH_EXT_RE)) {
    tokens.push(match[1]!.replace(/^\/+/, "").trim());
  }
  for (const match of text.matchAll(FILENAME_WITH_EXT_RE)) {
    const token = match[1]!.replace(/^\/+/, "").trim();
    if (!token.includes("/")) {
      tokens.push(token);
    }
  }
  return uniquePaths(tokens);
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

function extractTitleCandidates(text: string): string[] {
  let working = text.trim();
  if (!working) return [];

  working = working
    .replace(/^(?:what about|how about|maybe|try|please|can you|could you|would you)\s+/i, "")
    .replace(/^(?:delete|remove|trash|erase|drop|unlink)\s+(?:the\s+)?/i, "")
    .replace(/\?+$/g, "")
    .trim();

  working = working
    .replace(
      /\s+(?:in|from|inside)\s+(?:my\s+|the\s+)?[A-Za-z0-9][A-Za-z0-9 _-]*(?:\s+folder)?\s*$/i,
      "",
    )
    .replace(/\s+from\s+(?:my\s+)?vault\s*$/i, "")
    .replace(/\s+(?:note|file|files)\s*$/i, "")
    .trim();

  if (!working) return [];

  const candidates = [working];
  if (/\.(?:md|pdf|txt|csv|json)$/i.test(working)) {
    candidates.push(stripExtension(working));
  }
  return uniquePaths(candidates.filter((candidate) => candidate.length > 0));
}

function resolveFolderAndTitle(
  notesPath: string,
  folderHint: string,
  title: string,
  vaultIndex: Map<string, string>,
): string[] {
  const stem = stripExtension(title.replace(/\\/g, "/").split("/").pop() ?? title).trim();
  if (!stem) return [];

  const folderPath = folderHint.replace(/\\/g, "/").replace(/\/+$/, "");
  const directPath = `${folderPath}/${stem}.md`;
  const canonical = canonicalVaultPath(vaultIndex, directPath);
  if (canonical) {
    return [canonical];
  }

  return resolveBasenameMatches(notesPath, `${stem}.md`, folderHint);
}

function addWikilinkResolution(candidates: string[], notesPath: string, target: string): void {
  try {
    const resolved = resolveWikilink(notesPath, target);
    if ("path" in resolved) {
      candidates.push(resolved.path);
    } else {
      candidates.push(...resolved.candidates);
    }
  } catch {
    // Ignore unresolved wikilink-style titles.
  }
}

function extractFolderHint(text: string): string | null {
  const patterns = [
    /\b(?:inside|in)\s+(?:my\s+|the\s+)?([A-Za-z0-9][A-Za-z0-9 _-]*?)\s+folder\b/i,
    /\bfrom\s+(?:my\s+|the\s+)?([A-Za-z0-9][A-Za-z0-9 _-]*?)\s+folder\b/i,
    /\b(?:inside|in)\s+(?:my\s+|the\s+)?([A-Za-z0-9][A-Za-z0-9 _-]+)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const folder = match?.[1]?.trim();
    if (!folder) continue;
    const normalized = folder.replace(/\s+/g, " ");
    if (/^(vault|obsidian|note|notes|file|files)$/i.test(normalized)) {
      continue;
    }
    return normalized;
  }

  return null;
}

function folderMatchesPath(folderHint: string, vaultRelativePath: string): boolean {
  const folderLower = folderHint.toLowerCase();
  const pathLower = vaultRelativePath.replace(/\\/g, "/").toLowerCase();
  const segments = pathLower.split("/");
  return (
    segments[0] === folderLower ||
    pathLower.startsWith(`${folderLower}/`) ||
    pathLower.includes(`/${folderLower}/`)
  );
}

function resolveBasenameMatches(
  notesPath: string,
  basenameToken: string,
  folderHint?: string | null,
): string[] {
  const normalized = basenameToken.replace(/\\/g, "/");
  const fileName = normalized.includes("/") ? basename(normalized) : normalized;
  const baseLower = fileName.toLowerCase();
  const hasExtension = /\.[a-z0-9]+$/i.test(fileName);
  const stemLower = baseLower.replace(/\.[^.]+$/, "");

  let matches = listVaultFiles(notesPath).filter((path) => {
    const candidateName = basename(path).toLowerCase();
    if (hasExtension) {
      return candidateName === baseLower;
    }
    const candidateStem = candidateName.replace(/\.[^.]+$/, "");
    return candidateName === baseLower || candidateStem === stemLower;
  });

  if (normalized.includes("/")) {
    const withPath = normalized.endsWith(".md") ? normalized : `${normalized}.md`;
    matches = matches.filter((path) => path.toLowerCase().endsWith(`/${withPath.toLowerCase()}`));
  }

  if (folderHint) {
    return uniquePaths(matches.filter((path) => folderMatchesPath(folderHint, path)));
  }

  return uniquePaths(matches);
}

function extractPathLikeTokens(text: string): string[] {
  return extractBasenameTokens(text);
}

function searchByStem(notesPath: string, query: string, folderHint?: string | null): string[] {
  const normalized = query.trim();
  if (!normalized) return [];

  const basenameMatches = extractBasenameTokens(normalized);
  if (basenameMatches.length === 1) {
    return resolveBasenameMatches(notesPath, basenameMatches[0]!, folderHint);
  }

  const lower = normalized.toLowerCase();
  const matches = listVaultFiles(notesPath).filter((path) => {
    const fileName = basename(path).toLowerCase();
    const stemWithoutExt = fileName.replace(/\.[^.]+$/, "");
    return (
      fileName === lower ||
      stemWithoutExt === lower ||
      fileName.includes(lower) ||
      stemWithoutExt.includes(lower)
    );
  });

  if (folderHint) {
    return uniquePaths(matches.filter((path) => folderMatchesPath(folderHint, path)));
  }

  return uniquePaths(matches);
}

export function resolveDeleteTargetFromText(
  notesPath: string,
  text: string,
): DeleteTargetResolution {
  const trimmed = text.trim().replace(/`/g, " ").replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return { status: "not_found" };
  }

  const candidates: string[] = [];
  const vaultIndex = buildVaultPathIndex(notesPath);

  for (const link of extractWikilinks(trimmed)) {
    try {
      const resolved = resolveWikilink(notesPath, link);
      if ("path" in resolved) {
        candidates.push(resolved.path);
      } else {
        candidates.push(...resolved.candidates);
      }
    } catch {
      // Ignore invalid wikilinks and continue with other heuristics.
    }
  }

  const folderHint = extractFolderHint(trimmed);

  for (const token of extractPathLikeTokens(trimmed)) {
    const canonicalToken = canonicalVaultPath(vaultIndex, token);
    if (canonicalToken) {
      candidates.push(canonicalToken);
      continue;
    }

    const canonicalWithMd = canonicalVaultPath(vaultIndex, `${token}.md`);
    if (!token.endsWith(".md") && canonicalWithMd) {
      candidates.push(canonicalWithMd);
      continue;
    }

    candidates.push(...resolveBasenameMatches(notesPath, token, folderHint));
  }

  for (const title of extractTitleCandidates(trimmed)) {
    if (folderHint && !title.includes("/")) {
      candidates.push(...resolveFolderAndTitle(notesPath, folderHint, title, vaultIndex));
    }
    addWikilinkResolution(candidates, notesPath, title);
  }

  const query = normalizeQuery(trimmed);
  if (query) {
    addWikilinkResolution(candidates, notesPath, query);
    candidates.push(...searchByStem(notesPath, query, folderHint));
  }

  const unique = uniqueCanonicalPaths(vaultIndex, uniquePaths(candidates));
  if (unique.length === 1) {
    return { status: "found", path: unique[0]! };
  }
  if (unique.length > 1) {
    return { status: "ambiguous", candidates: unique.sort() };
  }

  return { status: "not_found" };
}
