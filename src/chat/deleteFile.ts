import { parseDeleteFileConfirmToken } from "./deleteFileConfirm";
export {
  buildDeleteFileConfirmToken,
  parseDeleteFileConfirmToken,
  type DeleteFileConfirmParts,
} from "./deleteFileConfirm";
import {
  formatUpdateConfirmationMessage,
  parseUpdateConfirmationToken,
} from "./updateConfirmation";

export function formatDeleteFileAssistantReply(response: string): string {
  const update = parseUpdateConfirmationToken(response);
  if (update) {
    return formatUpdateConfirmationMessage(update);
  }
  return response;
}

export const DELETE_FILE_ACTION_ID = "delete-file";

export const DELETE_FILE_LABEL = "Delete file";

export const DELETE_FILE_DECLINE_USER_MESSAGE = "No, please don't do that.";

export const DELETE_FILE_CONFIRM_USER_MESSAGE = "Yes, please delete it.";

type DeleteConfirmRunLookup = {
  status?: string;
  text: string;
};

export function findActiveDeleteConfirmRunId(
  messages: ReadonlyArray<{ runId?: string }>,
  runs: Record<string, DeleteConfirmRunLookup | undefined>,
  deleteConfirmResolved: Record<string, { confirmed: boolean }>,
): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const runId = messages[index]?.runId;
    if (!runId) continue;
    const run = runs[runId];
    if (!run || run.status !== "finished") continue;
    if (!parseDeleteFileConfirmToken(run.text)) continue;
    if (deleteConfirmResolved[runId]) continue;
    return runId;
  }
  return null;
}

export function isDeleteFileMessage(quickActionId?: string): boolean {
  return quickActionId === DELETE_FILE_ACTION_ID;
}

export function isDeleteFileComposerMode(composerQuickActionId?: string | null): boolean {
  return composerQuickActionId === DELETE_FILE_ACTION_ID;
}

export function isDeleteFileFlowMessage(quickActionId?: string): boolean {
  return isDeleteFileMessage(quickActionId);
}

const DELETE_INTENT_PATTERNS: RegExp[] = [/\b(delete|remove|trash|erase|drop)\b/i];

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

export function parseDeleteShortcut(
  text: string,
): { kind: "activate" } | { kind: "send"; body: string } | null {
  const trimmed = text.trim();
  if (!/^\/(?:d|delete)(?:\s|$)/i.test(trimmed)) return null;

  const body = trimmed
    .replace(/^\/delete\s*/i, "")
    .replace(/^\/d\s*/i, "")
    .trim();
  if (!body) return { kind: "activate" };
  return { kind: "send", body };
}

export function shouldActivateDeleteFileFromComposerInput(text: string): boolean {
  return /^\/(?:d|delete)\s$/i.test(text);
}
