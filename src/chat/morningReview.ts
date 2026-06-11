import type {
  CalendarEventEntity,
  ChatMessage,
  LinearIssueEntity,
  StructuredPayload,
  WhoopSnapshotEntity,
} from "./types";
import { filterOpenLinearIssues } from "./linearIssue";
export const GOOD_MORNING_FEEL_ACTION_ID = "good-morning-feel";
export const GOOD_MORNING_WAKE_ACTION_ID = "good-morning-wake";

export const GOOD_MORNING_WAKE_PROMPT =
  "Can you tell me what time you woke up so I can add it to your journal?";

export function getGoodMorningWakePlaceholder(): string {
  return "e.g. 7:15 AM";
}

export const GOOD_MORNING_FEEL_PROMPT = "How do you feel? How was your sleep?";

export function getGoodMorningFeelPlaceholder(): string {
  return "Share how you're feeling and how you slept…";
}

export const LEGACY_MORNING_REVIEW_ACTION_ID = "morning-review";

export const GOOD_MORNING_ACTION_ID = "good-morning";

/** @deprecated Use {@link GOOD_MORNING_ACTION_ID} */
export const MORNING_REVIEW_ACTION_ID = GOOD_MORNING_ACTION_ID;

export const GOOD_MORNING_LABEL = "Good morning";

export const MORNING_REVIEW_MESSAGE = "Good morning backster, what is on my plate today?";

/** Local hour (0–23) when the Good morning chip appears. */
export const MORNING_REVIEW_VISIBLE_START_HOUR = 5;

/** Local hour (0–23, exclusive) when the Good morning chip hides. */
export const MORNING_REVIEW_VISIBLE_END_HOUR = 12;

const MORNING_REVIEW_USED_STORAGE_KEY = "backster.morningReviewUsedDate";

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function wasMorningReviewUsedToday(date: Date = new Date()): boolean {
  try {
    return localStorage.getItem(MORNING_REVIEW_USED_STORAGE_KEY) === localDateKey(date);
  } catch {
    return false;
  }
}

export function markMorningReviewUsedToday(date: Date = new Date()): void {
  try {
    localStorage.setItem(MORNING_REVIEW_USED_STORAGE_KEY, localDateKey(date));
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

export function isMorningReviewHours(date: Date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= MORNING_REVIEW_VISIBLE_START_HOUR && hour < MORNING_REVIEW_VISIBLE_END_HOUR;
}

export function isMorningReviewChipVisible(date: Date = new Date()): boolean {
  return isMorningReviewHours(date) && !wasMorningReviewUsedToday(date);
}

export function isGoodMorningMessage(quickActionId?: string): boolean {
  return (
    quickActionId === GOOD_MORNING_ACTION_ID ||
    quickActionId === LEGACY_MORNING_REVIEW_ACTION_ID
  );
}

/** @deprecated Use {@link isGoodMorningMessage} */
export function isMorningReviewMessage(quickActionId?: string): boolean {
  return isGoodMorningMessage(quickActionId);
}

export function parseGoodMorningShortcut(text: string): boolean {
  return /^\/gm\s*$/i.test(text.trim());
}

/** @deprecated Use {@link parseGoodMorningShortcut} */
export function parseMorningReviewShortcut(text: string): boolean {
  return parseGoodMorningShortcut(text);
}

export function isGoodMorningFeelMessage(quickActionId?: string): boolean {
  return quickActionId === GOOD_MORNING_FEEL_ACTION_ID;
}

export function isGoodMorningWakeMessage(quickActionId?: string): boolean {
  return quickActionId === GOOD_MORNING_WAKE_ACTION_ID;
}

export function isGoodMorningFlowMessage(quickActionId?: string): boolean {
  return (
    isGoodMorningMessage(quickActionId) ||
    isGoodMorningWakeMessage(quickActionId) ||
    isGoodMorningFeelMessage(quickActionId)
  );
}

export function isGoodMorningComposerMode(composerQuickActionId?: string | null): boolean {
  return composerQuickActionId === GOOD_MORNING_ACTION_ID;
}

export function hasGoodMorningWakePromptForRun(
  messages: Array<Pick<ChatMessage, "role" | "flowVariant" | "text" | "flowRunId">>,
  runId: string,
): boolean {
  return messages.some(
    (entry) =>
      entry.role === "assistant" &&
      entry.flowVariant === "good-morning" &&
      entry.text === GOOD_MORNING_WAKE_PROMPT &&
      entry.flowRunId === runId,
  );
}

export function hasGoodMorningFeelPromptForRun(
  messages: Array<Pick<ChatMessage, "role" | "flowVariant" | "text" | "flowRunId">>,
  runId: string,
): boolean {
  return messages.some(
    (entry) =>
      entry.role === "assistant" &&
      entry.flowVariant === "good-morning" &&
      entry.text === GOOD_MORNING_FEEL_PROMPT &&
      entry.flowRunId === runId,
  );
}

export interface MorningReviewWeatherEntity {
  locationLabel: string;
  description: string;
  temperatureC: number | null;
}

export interface MorningReviewMetaEntity {
  id: string;
  greetingName?: string;
  weather?: MorningReviewWeatherEntity;
}

export interface MorningReviewData {
  meta: MorningReviewMetaEntity | null;
  calendarEvents: CalendarEventEntity[];
  whoopSnapshots: WhoopSnapshotEntity[];
  linearIssues: LinearIssueEntity[];
}

export function extractMorningReviewData(entities: StructuredPayload[]): MorningReviewData {
  const meta = entities.find((entity) => entity.type === "morning_review_meta");
  const calendar = entities.find((entity) => entity.type === "calendar_events");
  const whoop = entities.find((entity) => entity.type === "whoop_snapshots");
  const linear = entities.find((entity) => entity.type === "linear_issues");

  const result = {
    meta: meta?.type === "morning_review_meta" ? meta.meta : null,
    calendarEvents: calendar?.type === "calendar_events" ? calendar.items : [],
    whoopSnapshots: whoop?.type === "whoop_snapshots" ? whoop.items : [],
    linearIssues:
      linear?.type === "linear_issues"
        ? filterOpenLinearIssues(linear.items)
        : [],
  };

  return result;
}

export type MorningReviewTab = "overview" | "whoop" | "linear" | "calendar";

export function formatWeatherSummary(
  weather: MorningReviewWeatherEntity | null | undefined,
): string {
  if (!weather) {
    return "Weather is unavailable right now.";
  }

  const temp =
    weather.temperatureC == null ? "" : ` and ${weather.temperatureC}°C`;
  return `Weather today in ${weather.locationLabel} is ${weather.description}${temp}.`;
}

export function formatRecoveryGuidance(whoop: WhoopSnapshotEntity | null): string {
  if (!whoop) {
    return "Recovery data is not available yet.";
  }

  const score =
    whoop.recoveryScore != null ? `${Math.round(whoop.recoveryScore)}% recovery` : "recovery";

  if (whoop.recoveryState === "GREEN") {
    return `You're cleared for a full training day because ${score} is in the green.`;
  }
  if (whoop.recoveryState === "YELLOW") {
    return `Moderate activity fits best today with ${score} in the yellow.`;
  }
  if (whoop.recoveryState === "RED") {
    return `Prioritize rest and keep strain low today with ${score} in the red.`;
  }

  if (whoop.recoveryScore != null && whoop.recoveryScore >= 67) {
    return `You're in good shape today with ${score}.`;
  }
  if (whoop.recoveryScore != null && whoop.recoveryScore >= 34) {
    return `Take a balanced approach today with ${score}.`;
  }
  if (whoop.recoveryScore != null) {
    return `Take it easy today with ${score}.`;
  }

  return "Use your recovery score to gauge how hard to push today.";
}

function sleepSummary(whoop: WhoopSnapshotEntity | null): string {
  if (!whoop) {
    return "Whoop sleep data is not available yet.";
  }

  const parts: string[] = [];
  if (whoop.sleepDuration) {
    parts.push(`You slept ${whoop.sleepDuration}`);
  }
  if (whoop.sleepPerformance != null) {
    parts.push(`${Math.round(whoop.sleepPerformance)}% sleep performance`);
  }

  if (parts.length === 0) {
    return "Whoop sleep data is not available yet.";
  }

  return `${parts.join(" with ")} (Whoop).`;
}

function appointmentSummary(events: CalendarEventEntity[]): string {
  if (events.length === 0) {
    return "Nothing scheduled on your calendar today.";
  }

  const first = events[0];
  const time = first.start ?? "All day";
  return `Your first appointment today is ${time}: ${first.title}.`;
}

export function formatLinearDaySummary(count: number): string {
  if (count === 0) {
    return "It's a lighter day with nothing due in Linear today.";
  }
  if (count === 1) {
    return "You have 1 Linear issue due today.";
  }
  if (count <= 3) {
    return `It's a manageable day with ${count} Linear issues due today.`;
  }
  return `It's a busy day with ${count} Linear issues due today.`;
}

export function buildMorningReviewCopyText(data: MorningReviewData): string {
  const greetingName = data.meta?.greetingName;
  const greeting = greetingName ? `Good morning, ${greetingName}.` : "Good morning.";
  const whoop = data.whoopSnapshots[0] ?? null;

  return [
    greeting,
    formatWeatherSummary(data.meta?.weather),
    sleepSummary(whoop),
    formatRecoveryGuidance(whoop),
    appointmentSummary(data.calendarEvents),
    formatLinearDaySummary(data.linearIssues.length),
  ].join("\n\n");
}
