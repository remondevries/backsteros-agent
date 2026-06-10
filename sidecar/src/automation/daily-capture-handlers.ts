import { applyDailyCaptureDailyNote } from "../daily-note-automation.ts";
import {
  buildDailyCaptureResponse,
  isDailyCaptureQuickAction,
  normalizeDailyCaptureLogTime,
} from "../daily-capture.ts";
import type { AutomationHandler, AutomationHandlerContext } from "./types.ts";

export async function runDailyCaptureAutomation(ctx: AutomationHandlerContext): Promise<void> {
  const trimmed = ctx.text.trim();
  if (!trimmed) {
    ctx.completeFailed("Daily capture message is empty");
    return;
  }

  try {
    const logTime = ctx.captureTime
      ? normalizeDailyCaptureLogTime(ctx.captureTime) ?? undefined
      : undefined;

    const result = applyDailyCaptureDailyNote(ctx.notesPath, trimmed, {
      timezone: ctx.timezone,
      logTime,
    });

    ctx.logStep(
      `daily-capture-note-${ctx.runId}`,
      "notes",
      `Added capture to ${result.path}`,
      "completed",
      "daily_capture",
    );

    const response = buildDailyCaptureResponse();
    ctx.setLastAssistantText(response);
    ctx.broadcastAssistantMessage(response);
    ctx.completeFinished();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Daily capture failed";
    ctx.completeFailed(message);
  }
}

export const DAILY_CAPTURE_HANDLER: AutomationHandler = {
  id: "daily-capture",
  matches: (quickActionId) => isDailyCaptureQuickAction(quickActionId),
  run: runDailyCaptureAutomation,
};
