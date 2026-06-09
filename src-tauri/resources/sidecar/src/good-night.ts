import { loadUserTimezone } from "./context/profile.ts";
import {
  applyGoodNightDailyNote,
  computeProductivityScore,
  type DailyNoteWriteResult,
} from "./daily-note-automation.ts";
import { fetchCalendarEventsToday, type TodayCalendarSummary } from "./morning-review-calendar.ts";
import {
  fetchIssuesCompletedToday,
  moveIssuesDueTodayToTomorrow,
} from "./morning-review-linear.ts";
import { fetchWhoopTodaySnapshot } from "./morning-review-whoop.ts";
import type { LinearIssueEntity, WhoopSnapshotEntity } from "./types.ts";

export const GOOD_NIGHT_ACTION_ID = "good-night";

export const GOOD_NIGHT_REFLECTION_ACTION_ID = "good-night-reflection";

export const GOOD_NIGHT_ASK_AGENT_PROMPT = `[Good night — evening reflection setup]
Automated good night tasks (day log metrics, Linear rollover) are complete.

Your only job now: invite the user to share their evening reflection. Ask warmly and briefly in plain conversational language — not Meditations-style prose.

Prompt them to answer in their own words, covering:
- What went well
- Where I fell short
- What challenged me
- How I'll approach it differently
- Wins to remember

Do NOT write to their daily note yet. Do NOT apply Meditations-style writing to your reply. Wait for their response.`;

export function isGoodNightQuickAction(quickActionId?: string): boolean {
  return quickActionId === GOOD_NIGHT_ACTION_ID;
}

export function isGoodNightReflectionQuickAction(quickActionId?: string): boolean {
  return quickActionId === GOOD_NIGHT_REFLECTION_ACTION_ID;
}

export interface GoodNightActionResult {
  whoop: WhoopSnapshotEntity | null;
  dailyNoteUpdate: DailyNoteWriteResult | null;
  completedIssues: { count: number; issues: LinearIssueEntity[] };
  productivityScore: number | null;
  linear: Awaited<ReturnType<typeof moveIssuesDueTodayToTomorrow>>;
  calendar: TodayCalendarSummary;
  errors: Partial<
    Record<"whoop" | "obsidian" | "linear" | "linearCompleted" | "calendar", string>
  >;
}

async function runStep<T>(
  key: keyof GoodNightActionResult["errors"],
  errors: GoodNightActionResult["errors"],
  task: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await task();
  } catch (error) {
    errors[key] = error instanceof Error ? error.message : String(error);
    return fallback;
  }
}

export async function runGoodNightActions(notesPath: string): Promise<GoodNightActionResult> {
  const errors: GoodNightActionResult["errors"] = {};
  const timezone = loadUserTimezone();
  const now = new Date();

  const [linear, completedIssues, whoop, calendar] = await Promise.all([
    runStep("linear", errors, () => moveIssuesDueTodayToTomorrow({ timezone, now }), {
      moved: [] as LinearIssueEntity[],
      failed: [],
      tomorrowDate: "",
      fetchedCount: 0,
    }),
    runStep("linearCompleted", errors, () => fetchIssuesCompletedToday({ timezone, now }), {
      count: 0,
      issues: [] as LinearIssueEntity[],
    }),
    runStep(
      "whoop",
      errors,
      () => fetchWhoopTodaySnapshot({ timezone, now, includeStrainDeepDive: true }),
      null,
    ),
    runStep("calendar", errors, () => fetchCalendarEventsToday({ timezone, now }), {
      events: [],
      firstTimedEvent: null,
    }),
  ]);

  const productivityScore = computeProductivityScore(completedIssues.count);

  let dailyNoteUpdate: DailyNoteWriteResult | null = null;
  try {
    dailyNoteUpdate = applyGoodNightDailyNote(notesPath, {
      whoop,
      completedIssueCount: completedIssues.count,
      timezone,
      now,
    });
  } catch (error) {
    errors.obsidian = error instanceof Error ? error.message : String(error);
  }

  return {
    whoop,
    dailyNoteUpdate,
    completedIssues,
    productivityScore,
    linear,
    calendar,
    errors,
  };
}
