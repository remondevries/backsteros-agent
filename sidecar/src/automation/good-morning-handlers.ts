import { applyMorningReviewDailyNote } from "../daily-note-automation.ts";
import { loadUserFirstName } from "../context/profile.ts";
import { buildGoodMorningChatResponse, filterUrgentLinearIssues } from "../good-morning-response.ts";
import { runGoodMorningFeelFlow } from "../good-morning-feel.ts";
import { isGoodMorningFeelQuickAction } from "../good-morning.ts";
import { isMorningReviewQuickAction } from "../morning-review-linear.ts";
import { prefetchMorningReviewData } from "../morning-review-prefetch.ts";
import { isTestExecutionMode } from "../execution-mode.ts";
import type { AutomationHandler, AutomationHandlerContext } from "./types.ts";

export async function runGoodMorningInitialAutomation(ctx: AutomationHandlerContext): Promise<void> {
  const prefetched = await prefetchMorningReviewData();

  const logPrefetchStep = (
    stepId: string,
    kind: Parameters<AutomationHandlerContext["logStep"]>[1],
    label: string,
    status: "completed" | "error",
  ) => {
    ctx.logStep(stepId, kind, label, status, "morning_review");
  };

  if (prefetched.errors.weather) {
    logPrefetchStep(
      `morning-weather-${ctx.runId}`,
      "generic",
      `Weather fetch failed: ${prefetched.errors.weather}`,
      "error",
    );
  } else if (prefetched.weather) {
    logPrefetchStep(`morning-weather-${ctx.runId}`, "generic", "Loaded today's weather", "completed");
  }

  if (prefetched.errors.whoop) {
    logPrefetchStep(
      `morning-whoop-${ctx.runId}`,
      "whoop",
      `Whoop fetch failed: ${prefetched.errors.whoop}`,
      "error",
    );
  } else if (prefetched.whoop) {
    logPrefetchStep(`morning-whoop-${ctx.runId}`, "whoop", "Loaded today's Whoop snapshot", "completed");
  } else {
    logPrefetchStep(`morning-whoop-${ctx.runId}`, "whoop", "No Whoop data for today", "completed");
  }

  if (prefetched.errors.linear) {
    logPrefetchStep(
      `morning-linear-${ctx.runId}`,
      "linear",
      `Linear fetch failed: ${prefetched.errors.linear}`,
      "error",
    );
  } else {
    logPrefetchStep(
      `morning-linear-${ctx.runId}`,
      "linear",
      prefetched.linearIssues.length > 0
        ? `Loaded ${prefetched.linearIssues.length} Linear issue(s) due today`
        : "No Linear issues due today",
      "completed",
    );
  }

  if (prefetched.errors.calendar) {
    logPrefetchStep(
      `morning-calendar-${ctx.runId}`,
      "calendar",
      `Calendar fetch failed: ${prefetched.errors.calendar}`,
      "error",
    );
  } else {
    logPrefetchStep(
      `morning-calendar-${ctx.runId}`,
      "calendar",
      prefetched.calendar.events.length > 0
        ? `Loaded ${prefetched.calendar.events.length} calendar event(s) for today`
        : "No calendar events today",
      "completed",
    );
  }

  try {
    applyMorningReviewDailyNote(ctx.notesPath, {
      whoop: prefetched.whoop,
      weather: prefetched.weather,
      timezone: ctx.timezone,
    });
    logPrefetchStep(
      `morning-obsidian-${ctx.runId}`,
      "notes",
      "Updated today's daily note with wake time, sleep, weather, and recovery",
      "completed",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logPrefetchStep(
      `morning-obsidian-${ctx.runId}`,
      "notes",
      `Daily note update failed: ${message}`,
      "error",
    );
  }

  const urgentIssues = filterUrgentLinearIssues(prefetched.linearIssues);
  if (urgentIssues.length > 0) {
    const urgentEvent = {
      type: "entities.created" as const,
      runId: ctx.runId,
      entityType: "linear_issue" as const,
      items: urgentIssues,
    };
    ctx.broadcast(urgentEvent);
    ctx.scheduleLinearAvatarBackfill(ctx.runId, urgentEvent);
  }

  const response = buildGoodMorningChatResponse({
    firstName: loadUserFirstName(),
    linearIssues: prefetched.linearIssues,
    whoop: prefetched.whoop,
  });

  ctx.setLastAssistantText(response);
  ctx.broadcastAssistantMessage(response);
  ctx.completeFinished();
}

export async function runGoodMorningFeelAutomation(ctx: AutomationHandlerContext): Promise<void> {
  const logFeelStep = (stepId: string, label: string, status: "completed" | "error" | "running") => {
    ctx.logStep(stepId, "generic", label, status, "good_morning_feel");
  };

  const polishStepId = `good-morning-feel-polish-${ctx.runId}`;
  logFeelStep(polishStepId, "Polishing your feel line", "running");

  try {
    const result = await runGoodMorningFeelFlow(ctx.notesPath, ctx.text, {
      model: isTestExecutionMode() ? undefined : ctx.selectedModel,
      timezone: ctx.timezone,
    });

    logFeelStep(polishStepId, "Polished feel line", "completed");
    logFeelStep(`good-morning-feel-note-${ctx.runId}`, "Updated daily note", "completed");

    ctx.setLastAssistantText(result.response);
    ctx.broadcastAssistantMessage(result.response);
    ctx.completeFinished();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Good morning feel failed";
    logFeelStep(polishStepId, message, "error");
    ctx.completeFailed(message);
  }
}

export const GOOD_MORNING_INITIAL_HANDLER: AutomationHandler = {
  id: "good-morning-initial",
  matches: (quickActionId) => isMorningReviewQuickAction(quickActionId),
  run: runGoodMorningInitialAutomation,
};

export const GOOD_MORNING_FEEL_HANDLER: AutomationHandler = {
  id: "good-morning-feel",
  matches: (quickActionId) => isGoodMorningFeelQuickAction(quickActionId),
  run: runGoodMorningFeelAutomation,
};
