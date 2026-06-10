import { loadUserFirstName } from "../context/profile.ts";
import { isTestExecutionMode } from "../execution-mode.ts";
import { buildGoodNightChatResponse } from "../good-night-response.ts";
import { runGoodNightReflectionFlow } from "../good-night-reflection.ts";
import {
  isGoodNightQuickAction,
  isGoodNightReflectionQuickAction,
  runGoodNightActions,
} from "../good-night.ts";
import type { ToolCategory } from "../types.ts";
import type { AutomationHandler, AutomationHandlerContext } from "./types.ts";

export async function runGoodNightInitialAutomation(ctx: AutomationHandlerContext): Promise<void> {
  const result = await runGoodNightActions(ctx.notesPath);

  const logGoodNightStep = (
    stepId: string,
    kind: ToolCategory,
    label: string,
    status: "completed" | "error",
  ) => {
    ctx.logStep(stepId, kind, label, status, "good_night");
  };

  if (result.errors.whoop) {
    logGoodNightStep(
      `good-night-whoop-${ctx.runId}`,
      "whoop",
      `Whoop fetch failed: ${result.errors.whoop}`,
      "error",
    );
  } else if (result.whoop) {
    logGoodNightStep(
      `good-night-whoop-${ctx.runId}`,
      "whoop",
      result.whoop.strainScore != null
        ? `Loaded today's strain (${result.whoop.strainScore})`
        : "Loaded today's Whoop snapshot",
      "completed",
    );
  } else {
    logGoodNightStep(`good-night-whoop-${ctx.runId}`, "whoop", "No Whoop data for today", "completed");
  }

  if (result.errors.obsidian) {
    logGoodNightStep(
      `good-night-obsidian-${ctx.runId}`,
      "notes",
      `Daily note update failed: ${result.errors.obsidian}`,
      "error",
    );
  } else if (result.dailyNoteUpdate) {
    const productivityLabel =
      result.productivityScore != null
        ? `, productivity ${result.productivityScore} (${result.completedIssues.count} issues completed)`
        : "";
    logGoodNightStep(
      `good-night-obsidian-${ctx.runId}`,
      "notes",
      `Updated ${result.dailyNoteUpdate.path} with bedtime, strain, recovery, and productivity${productivityLabel}`,
      "completed",
    );
  }

  if (result.errors.linearCompleted) {
    logGoodNightStep(
      `good-night-linear-completed-${ctx.runId}`,
      "linear",
      `Completed issues fetch failed: ${result.errors.linearCompleted}`,
      "error",
    );
  } else {
    logGoodNightStep(
      `good-night-linear-completed-${ctx.runId}`,
      "linear",
      `${result.completedIssues.count} Linear issue(s) completed today`,
      "completed",
    );
  }

  if (result.errors.linear) {
    logGoodNightStep(
      `good-night-linear-${ctx.runId}`,
      "linear",
      `Linear rollover failed: ${result.errors.linear}`,
      "error",
    );
  } else if (result.linear.moved.length > 0) {
    logGoodNightStep(
      `good-night-linear-${ctx.runId}`,
      "linear",
      `Moved ${result.linear.moved.length} Linear issue(s) to ${result.linear.tomorrowDate}`,
      "completed",
    );
  } else if (result.linear.failed.length > 0) {
    logGoodNightStep(
      `good-night-linear-${ctx.runId}`,
      "linear",
      `Failed to move ${result.linear.failed.length} Linear issue(s) to tomorrow`,
      "error",
    );
  } else {
    logGoodNightStep(
      `good-night-linear-${ctx.runId}`,
      "linear",
      "No Linear issues due today to move",
      "completed",
    );
  }

  if (result.completedIssues.issues.length > 0) {
    const completedEvent = {
      type: "entities.created" as const,
      runId: ctx.runId,
      entityType: "linear_issue_completed" as const,
      items: result.completedIssues.issues,
    };
    ctx.broadcast(completedEvent);
    ctx.scheduleLinearAvatarBackfill(ctx.runId, {
      ...completedEvent,
      entityType: "linear_issue",
    });
  }

  const response = buildGoodNightChatResponse({
    firstName: loadUserFirstName(),
    movedIssueCount: result.linear.moved.length,
    completedIssueCount: result.completedIssues.count,
    productivityScore: result.productivityScore,
    whoop: result.whoop,
  });

  ctx.setLastAssistantText(response);
  ctx.broadcastAssistantMessage(response);
  ctx.completeFinished();
}

export async function runGoodNightReflectionAutomation(ctx: AutomationHandlerContext): Promise<void> {
  const logReflectionStep = (
    stepId: string,
    label: string,
    status: "completed" | "error" | "running",
  ) => {
    ctx.logStep(stepId, "generic", label, status, "good_night_reflection");
  };

  const polishStepId = `good-night-reflection-polish-${ctx.runId}`;
  logReflectionStep(polishStepId, "Polishing your evening reflection", "running");

  try {
    const result = await runGoodNightReflectionFlow(ctx.notesPath, ctx.text, {
      model: isTestExecutionMode() ? undefined : ctx.selectedModel,
      timezone: ctx.timezone,
    });

    logReflectionStep(polishStepId, "Polished evening reflection", "completed");

    ctx.broadcast({
      type: "tool.completed",
      runId: ctx.runId,
      toolCallId: `good-night-reflection-daily-note-${ctx.runId}`,
      toolName: "write_workspace_file",
      category: "notes",
      structured: {
        type: "file_diff",
        path: result.dailyNoteUpdate.path,
        summary: `Updated ${result.dailyNoteUpdate.path} with evening reflection`,
      },
    });
    ctx.logStep(
      `good-night-reflection-note-${ctx.runId}`,
      "notes",
      `Updated ${result.dailyNoteUpdate.path} with evening reflection`,
      "completed",
      "good_night_reflection",
    );

    ctx.setLastAssistantText(result.response);
    ctx.broadcastAssistantMessage(result.response);
    ctx.completeFinished();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Good night reflection failed";
    logReflectionStep(polishStepId, message, "error");
    ctx.completeFailed(message);
  }
}

export const GOOD_NIGHT_INITIAL_HANDLER: AutomationHandler = {
  id: "good-night-initial",
  matches: (quickActionId) => isGoodNightQuickAction(quickActionId),
  run: runGoodNightInitialAutomation,
};

export const GOOD_NIGHT_REFLECTION_HANDLER: AutomationHandler = {
  id: "good-night-reflection",
  matches: (quickActionId) => isGoodNightReflectionQuickAction(quickActionId),
  run: runGoodNightReflectionAutomation,
};
