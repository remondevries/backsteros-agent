import { deleteWorkspaceFile } from "./letter-deletion.ts";
import { buildDeleteFileConfirmToken } from "./delete-file-confirm.ts";
import { resolveDeleteTargetFromText } from "./delete-file-resolve.ts";

export const DELETE_FILE_ACTION_ID = "delete-file";

export const DELETE_FILE_LABEL = "Delete file";

export const DELETE_FILE_PLACEHOLDER = "Which file should I delete?";

export interface PendingDeleteFile {
  path: string;
}

const pendingDeleteBySession = new Map<string, PendingDeleteFile>();

export function setPendingDeleteFile(sessionId: string, pending: PendingDeleteFile): void {
  pendingDeleteBySession.set(sessionId, pending);
}

export function clearPendingDeleteFile(sessionId: string): void {
  pendingDeleteBySession.delete(sessionId);
}

export function takePendingDeleteFile(sessionId: string): PendingDeleteFile | null {
  const pending = pendingDeleteBySession.get(sessionId) ?? null;
  pendingDeleteBySession.delete(sessionId);
  return pending;
}

export function peekPendingDeleteFile(sessionId: string): PendingDeleteFile | null {
  return pendingDeleteBySession.get(sessionId) ?? null;
}

export function isDeleteFileQuickAction(quickActionId?: string): boolean {
  return quickActionId === DELETE_FILE_ACTION_ID;
}

const DELETE_INTENT_PATTERNS: RegExp[] = [
  /\b(delete|remove|trash|erase|drop)\b/i,
];

const DELETE_TARGET_PATTERNS: RegExp[] = [
  /\b(vault|obsidian|note|notes|file|files|\.md\b|\.pdf\b)\b/i,
  /\[\[[^\]]+\]\]/,
];

export function detectDeleteFileIntent(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || /^\/d(?:\s|$)/i.test(trimmed)) {
    return false;
  }
  return (
    DELETE_INTENT_PATTERNS.some((pattern) => pattern.test(trimmed)) &&
    DELETE_TARGET_PATTERNS.some((pattern) => pattern.test(trimmed))
  );
}

export function buildDeleteFileReadyMessage(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const isLetterWrapper = normalized.startsWith("Letters/") && normalized.endsWith(".md");
  if (isLetterWrapper) {
    const pdfPath = normalized.replace(/\.md$/i, ".pdf");
    return `I found the note in \`${normalized}\` and its paired PDF \`${pdfPath}\`. Do you want me to delete both?`;
  }
  return `I found the note in \`${normalized}\`. Do you want me to delete it?`;
}

export function buildDeleteFileConfirmResponse(path: string): string {
  return buildDeleteFileConfirmToken(path, buildDeleteFileReadyMessage(path));
}

export function buildDeleteFileNotFoundResponse(): string {
  return "I couldn't find a file matching that. Try the note title, a [[wikilink]], or a path like `Daily/2025-06-10.md`.";
}

export function buildDeleteFileAmbiguousResponse(candidates: string[]): string {
  const lines = candidates.map((candidate) => `- \`${candidate}\``);
  return [
    "I found more than one possible file:",
    ...lines,
    "",
    "Tell me which one to delete using the full path or a clearer name.",
  ].join("\n");
}

export function resolveDeleteFileRequest(
  notesPath: string,
  text: string,
): { kind: "confirm"; path: string; response: string } | { kind: "reply"; response: string } {
  const resolution = resolveDeleteTargetFromText(notesPath, text.trim());
  if (resolution.status === "not_found") {
    return { kind: "reply", response: buildDeleteFileNotFoundResponse() };
  }
  if (resolution.status === "ambiguous") {
    return { kind: "reply", response: buildDeleteFileAmbiguousResponse(resolution.candidates) };
  }
  return {
    kind: "confirm",
    path: resolution.path,
    response: buildDeleteFileConfirmResponse(resolution.path),
  };
}

export function respondToPendingDeleteFile(
  notesPath: string,
  sessionId: string,
  action: "confirm" | "return",
): { response: string; deleted?: string[] } {
  const pending = takePendingDeleteFile(sessionId);
  if (!pending) {
    return { response: "There's nothing queued for deletion right now." };
  }

  if (action === "return") {
    return { response: "I did not delete the note, it's still in the original location." };
  }

  try {
    const deleted = deleteWorkspaceFile(notesPath, pending.path);
    return {
      response: "I have deleted the note.",
      deleted,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return { response: message };
  }
}
