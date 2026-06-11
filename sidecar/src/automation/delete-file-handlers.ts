import {
  isDeleteFileQuickAction,
  peekPendingDeleteFile,
  resolveDeleteFileRequest,
  setPendingDeleteFile,
} from "../delete-file.ts";
import type { AutomationHandler, AutomationHandlerContext } from "./types.ts";

export async function runDeleteFileAutomation(
  ctx: AutomationHandlerContext,
): Promise<void> {
  const trimmed = ctx.text.trim();
  if (!trimmed) {
    ctx.completeFailed("Tell me which file to delete.");
    return;
  }

  const resolveStepId = `delete-file-resolve-${ctx.runId}`;
  ctx.logStep(resolveStepId, "notes", "Finding the file to delete", "running", "delete_file");

  try {
    const result = resolveDeleteFileRequest(ctx.notesPath, trimmed);
    ctx.logStep(
      resolveStepId,
      "notes",
      result.kind === "confirm" ? `Found ${result.path}` : "Need more delete details",
      "completed",
      "delete_file",
    );

    if (result.kind === "reply") {
      ctx.setLastAssistantText(result.response);
      ctx.broadcastAssistantMessage(result.response);
      ctx.completeFinished();
      return;
    }

    if (!ctx.sessionId) {
      ctx.completeFailed("Delete file session is missing");
      return;
    }

    setPendingDeleteFile(ctx.sessionId, { path: result.path });
    ctx.setLastAssistantText(result.response);
    ctx.broadcastAssistantMessage(result.response);
    ctx.completeFinished();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete file lookup failed";
    ctx.logStep(resolveStepId, "notes", message, "error", "delete_file");
    ctx.completeFailed(message);
  }
}

export const DELETE_FILE_HANDLER: AutomationHandler = {
  id: "delete-file",
  matches: (quickActionId) => isDeleteFileQuickAction(quickActionId),
  run: runDeleteFileAutomation,
};

export function hasPendingDeleteFile(sessionId: string): boolean {
  return peekPendingDeleteFile(sessionId) != null;
}
