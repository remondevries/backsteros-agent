import { existsSync, statSync, unlinkSync } from "node:fs";
import { join, relative } from "node:path";
import { LETTERS_FOLDER } from "./letter-filing.ts";
import { assertWritableVaultPath } from "./vault-paths.ts";

function resolveWorkspacePath(notesPath: string, targetPath: string): string {
  const abs = join(notesPath, targetPath);
  const rel = relative(notesPath, abs);
  if (rel.startsWith("..") || rel === "..") {
    throw new Error("Path must stay inside the notes workspace");
  }
  return abs;
}

export function normalizeLetterRelativePath(path: string): string {
  return path.trim().replace(/\\/g, "/").replace(/^\.\/+/, "");
}

export function isLetterWrapperRelativePath(path: string): boolean {
  const normalized = normalizeLetterRelativePath(path);
  const folder = normalized.split("/")[0] ?? "";
  return folder === LETTERS_FOLDER && normalized.toLowerCase().endsWith(".md");
}

export function pairedLetterPdfRelativePath(wrapperPath: string): string {
  return normalizeLetterRelativePath(wrapperPath).replace(/\.md$/i, ".pdf");
}

export function expandLetterDeletionShellCommand(command: string): string {
  if (!/\brm\b/i.test(command)) {
    return command;
  }

  const wrapperPaths = new Set<string>();

  for (const match of command.matchAll(/["'](Letters\/[^"']+\.md)["']/gi)) {
    wrapperPaths.add(match[1]!);
  }

  for (const match of command.matchAll(/(?:^|\s)(Letters\/[^\s"'`;|&]+\.md)/gi)) {
    wrapperPaths.add(match[1]!);
  }

  if (wrapperPaths.size === 0) {
    return command;
  }

  const additions: string[] = [];
  for (const wrapperPath of wrapperPaths) {
    const pdfPath = pairedLetterPdfRelativePath(wrapperPath);
    if (!command.includes(pdfPath)) {
      additions.push(pdfPath.includes(" ") ? `"${pdfPath}"` : pdfPath);
    }
  }

  if (additions.length === 0) {
    return command;
  }

  return `${command} ${additions.join(" ")}`;
}

export function deleteLetterWrapperWithPdf(
  notesPath: string,
  wrapperRelPath: string,
): string[] {
  const wrapperPath = normalizeLetterRelativePath(wrapperRelPath);
  if (!isLetterWrapperRelativePath(wrapperPath)) {
    throw new Error(`Not a letter wrapper note: ${wrapperPath}`);
  }

  const deleted: string[] = [];
  const targets = [wrapperPath, pairedLetterPdfRelativePath(wrapperPath)];

  for (const relPath of targets) {
    const abs = resolveWorkspacePath(notesPath, relPath);
    if (existsSync(abs) && statSync(abs).isFile()) {
      unlinkSync(abs);
      deleted.push(relPath);
    }
  }

  if (deleted.length === 0) {
    throw new Error(`Letter wrapper not found: ${wrapperPath}`);
  }

  return deleted;
}

export function deleteWorkspaceFile(
  notesPath: string,
  targetRelPath: string,
): string[] {
  const target = normalizeLetterRelativePath(targetRelPath);
  assertWritableVaultPath(target);

  if (isLetterWrapperRelativePath(target)) {
    return deleteLetterWrapperWithPdf(notesPath, target);
  }

  const abs = resolveWorkspacePath(notesPath, target);
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    throw new Error(`File not found: ${target}`);
  }

  unlinkSync(abs);
  return [target];
}
