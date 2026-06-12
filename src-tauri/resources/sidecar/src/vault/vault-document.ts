import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { joinFrontmatterAndBody, splitFrontmatter } from "../daily-note.ts";
import { normalizeVaultRelativePath } from "../vault-paths.ts";

export type VaultDocumentContent = {
  path: string;
  title: string;
  body: string;
  frontmatter: string | null;
};

function titleFromBody(path: string, body: string): { title: string; body: string } {
  const lines = body.split("\n");
  const firstNonEmptyIndex = lines.findIndex((line) => line.trim().length > 0);
  if (firstNonEmptyIndex === -1) {
    return { title: basename(path, ".md"), body: "" };
  }

  const match = /^#\s+(.+)$/.exec(lines[firstNonEmptyIndex]!.trim());
  if (!match?.[1]) {
    return { title: basename(path, ".md"), body };
  }

  const title = match[1].trim() || basename(path, ".md");
  const remaining = [...lines.slice(0, firstNonEmptyIndex), ...lines.slice(firstNonEmptyIndex + 1)];
  while (remaining.length > 0 && remaining[0]?.trim() === "") {
    remaining.shift();
  }

  return { title, body: remaining.join("\n") };
}

function bodyWithTitle(title: string, body: string): string {
  const trimmedTitle = title.trim();
  const trimmedBody = body.trimEnd();
  if (!trimmedTitle) {
    return trimmedBody ? `${trimmedBody}\n` : "";
  }
  if (!trimmedBody) {
    return `# ${trimmedTitle}\n`;
  }
  return `# ${trimmedTitle}\n\n${trimmedBody}\n`;
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
  const parsed = titleFromBody(path, body);

  return {
    path,
    title: parsed.title,
    body: parsed.body,
    frontmatter,
  };
}

export function updateVaultDocument(
  notesPath: string,
  relativePath: string,
  updates: { title?: string; body?: string },
): VaultDocumentContent {
  const current = readVaultDocument(notesPath, relativePath);
  const nextTitle = updates.title !== undefined ? updates.title : current.title;
  const nextBody = updates.body !== undefined ? updates.body : current.body;
  const abs = join(notesPath, current.path);
  const content = joinFrontmatterAndBody(current.frontmatter, bodyWithTitle(nextTitle, nextBody));
  writeFileSync(abs, content, "utf8");
  return readVaultDocument(notesPath, current.path);
}
