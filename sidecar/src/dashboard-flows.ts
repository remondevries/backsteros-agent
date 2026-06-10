import type { SDKAgent } from "@cursor/sdk";
import { applyMorningReviewDailyNote } from "./daily-note-automation.ts";
import { loadUserTimezone } from "./context/profile.ts";
import { getSelectedModelSelection } from "./models.ts";
import { loadSettings } from "./store.ts";
import { isTestExecutionMode } from "./execution-mode.ts";
import { runGoodMorningFeelFlow } from "./good-morning-feel.ts";
import { runGoodNightActions } from "./good-night.ts";
import { buildGoodNightChatResponse } from "./good-night-response.ts";
import { runGoodNightReflectionFlow } from "./good-night-reflection.ts";
import { GOOD_NIGHT_REFLECTION_SECTIONS } from "./good-night-sections.ts";
import { prefetchMorningReviewData } from "./morning-review-prefetch.ts";
import { loadUserFirstName } from "./context/profile.ts";

function buildReflectionPayloadText(answers: string[]): string {
  return JSON.stringify({
    version: 1,
    answers: GOOD_NIGHT_REFLECTION_SECTIONS.map((section, index) => ({
      section,
      raw: answers[index]?.trim() ?? "",
    })),
  });
}

export async function runGoodMorningDashboardFlow(notesPath: string) {
  const prefetched = await prefetchMorningReviewData();
  const timezone = loadUserTimezone();

  let dailyNoteUpdate = null;
  try {
    dailyNoteUpdate = applyMorningReviewDailyNote(notesPath, {
      whoop: prefetched.whoop,
      weather: prefetched.weather,
      timezone,
    });
  } catch (error) {
    prefetched.errors.obsidian =
      error instanceof Error ? error.message : "Daily note update failed";
  }

  return { prefetched, dailyNoteUpdate };
}

export async function runGoodMorningFeelDashboardFlow(
  notesPath: string,
  answer: string,
  _agent?: SDKAgent,
) {
  const settings = loadSettings();
  const model = isTestExecutionMode(settings) ? undefined : getSelectedModelSelection(settings);

  return runGoodMorningFeelFlow(notesPath, answer, {
    model,
    timezone: loadUserTimezone(),
  });
}

export async function runGoodNightDashboardFlow(notesPath: string) {
  const result = await runGoodNightActions(notesPath);
  const response = buildGoodNightChatResponse({
    firstName: loadUserFirstName(),
    movedIssueCount: result.linear.moved.length,
    completedIssueCount: result.completedIssues.count,
    productivityScore: result.productivityScore,
    whoop: result.whoop,
  });

  return { ...result, response };
}

export async function runGoodNightReflectionDashboardFlow(
  notesPath: string,
  answers: string[],
  _agent?: SDKAgent,
) {
  if (answers.length !== GOOD_NIGHT_REFLECTION_SECTIONS.length) {
    throw new Error("Good night reflection requires five answers");
  }

  const settings = loadSettings();
  const model = isTestExecutionMode(settings) ? undefined : getSelectedModelSelection(settings);
  const payloadText = buildReflectionPayloadText(answers);

  return runGoodNightReflectionFlow(notesPath, payloadText, {
    model,
    timezone: loadUserTimezone(),
  });
}
