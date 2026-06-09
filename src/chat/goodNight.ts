import type {
  CalendarEventEntity,
  GoodNightMetaEntity,
  LinearIssueEntity,
  StructuredPayload,
  WhoopSnapshotEntity,
} from "./types";
import { formatStrainInsight } from "./whoopStrain";

export const GOOD_NIGHT_ACTION_ID = "good-night";

export const GOOD_NIGHT_REFLECTION_ACTION_ID = "good-night-reflection";

export const GOOD_NIGHT_MESSAGE = "Good night";

export const GOOD_NIGHT_LABEL = "Good night";

export const GOOD_NIGHT_REFLECTION_SECTIONS = [
  "What went well",
  "Where I fell short",
  "What challenged me",
  "How I'll approach it differently",
  "Wins to remember",
] as const;

export const GOOD_NIGHT_REFLECTION_QUESTIONS = [
  "What went well today?",
  "Where did you fall short today?",
  "What challenged you today?",
  "How will you approach things differently tomorrow?",
  "What wins do you want to remember?",
] as const;

export const GOOD_NIGHT_REFLECTION_COUNT = GOOD_NIGHT_REFLECTION_QUESTIONS.length;

/** Pause before the next reflection question so the flow feels conversational. */
export const GOOD_NIGHT_REFLECTION_THINKING_MS = 1600;

export const GOOD_NIGHT_MEDITATIONS_STYLE = `[Evening reflection writing style — apply ONLY for this edit]
- Self-dialogue: first person ("I...", "Remember..."), not for an audience
- Honest inventory: name what happened without dramatizing or excusing
- Values, not vanity: tie actions to how you want to live
- Growth, not perfection: "where I fell short" is data for tomorrow, not self-attack
- Stoic focus: separate what you controlled from what you did not
- Short blocks: 2–5 bullets per section; one clear sentence beats a paragraph
- Bad-day anchor: "Wins to remember" must include at least one real win`;

export interface GoodNightData {
  meta: GoodNightMetaEntity | null;
  calendarEvents: CalendarEventEntity[];
  whoopSnapshots: WhoopSnapshotEntity[];
  movedIssues: LinearIssueEntity[];
  completedIssues: LinearIssueEntity[];
}

export function extractGoodNightData(entities: StructuredPayload[]): GoodNightData {
  const meta = entities.find((entity) => entity.type === "good_night_meta");
  const calendar = entities.find((entity) => entity.type === "calendar_events");
  const whoop = entities.find((entity) => entity.type === "whoop_snapshots");
  const moved = entities.find((entity) => entity.type === "linear_issues_moved");
  const completed = entities.find((entity) => entity.type === "linear_issues_completed");

  return {
    meta: meta?.type === "good_night_meta" ? meta.meta : null,
    calendarEvents: calendar?.type === "calendar_events" ? calendar.items : [],
    whoopSnapshots: whoop?.type === "whoop_snapshots" ? whoop.items : [],
    movedIssues: moved?.type === "linear_issues_moved" ? moved.items : [],
    completedIssues: completed?.type === "linear_issues_completed" ? completed.items : [],
  };
}

export type GoodNightTab = "overview" | "whoop" | "linear" | "calendar";

export function formatStrainSummary(whoop: WhoopSnapshotEntity | null): string {
  if (!whoop) {
    return "Strain data is not available yet.";
  }

  return formatStrainInsight(whoop);
}

export function formatMovedIssuesSummary(count: number, tomorrowDate?: string): string {
  if (count === 0) {
    return "Nothing was moved to tomorrow.";
  }
  const when = tomorrowDate ? ` for ${tomorrowDate}` : " to tomorrow";
  if (count === 1) {
    return `1 issue was moved${when}.`;
  }
  return `${count} issues were moved${when}.`;
}

export function formatCompletedIssuesSummary(count: number): string {
  if (count === 0) {
    return "No Linear issues completed today.";
  }
  if (count === 1) {
    return "1 issue completed today.";
  }
  return `${count} issues completed today.`;
}

export function formatProductivitySummary(score: number | null | undefined): string | null {
  if (score == null) {
    return null;
  }
  return `Productivity score: ${Math.round(score)}%`;
}

export function buildGoodNightCopyText(data: GoodNightData): string {
  const greetingName = data.meta?.greetingName;
  const greeting = greetingName ? `Good night, ${greetingName}.` : "Good night.";
  const whoop = data.whoopSnapshots[0] ?? null;
  const productivity = formatProductivitySummary(data.meta?.productivityScore);

  const lines = [
    greeting,
    productivity,
    formatStrainSummary(whoop),
    formatMovedIssuesSummary(data.movedIssues.length, data.meta?.tomorrowDate),
    formatCompletedIssuesSummary(data.completedIssues.length),
  ].filter((line): line is string => Boolean(line));

  if (data.calendarEvents.length === 0) {
    lines.push("Nothing on your calendar today.");
  } else if (data.calendarEvents.length === 1) {
    const event = data.calendarEvents[0];
    const time = event.start ?? "All day";
    lines.push(`1 calendar event today: ${time} — ${event.title}.`);
  } else {
    lines.push(`${data.calendarEvents.length} calendar events today.`);
  }

  return lines.join("\n\n");
}

export function isGoodNightMessage(quickActionId?: string): boolean {
  return quickActionId === GOOD_NIGHT_ACTION_ID;
}

export function isGoodNightReflectionMessage(quickActionId?: string): boolean {
  return quickActionId === GOOD_NIGHT_REFLECTION_ACTION_ID;
}

export function isGoodNightFlowMessage(quickActionId?: string): boolean {
  return isGoodNightMessage(quickActionId) || isGoodNightReflectionMessage(quickActionId);
}

export function isGoodNightReflectionAnswerMessage(
  messages: Array<{ role: string; text: string; quickActionId?: string; flowVariant?: string }>,
  index: number,
): boolean {
  const message = messages[index];
  if (!message || message.role !== "user") return false;
  if (message.flowVariant === "good-night") return true;
  if (isGoodNightReflectionMessage(message.quickActionId)) return true;

  const previous = messages[index - 1];
  if (
    previous?.role === "assistant" &&
    GOOD_NIGHT_REFLECTION_QUESTIONS.includes(
      previous.text as (typeof GOOD_NIGHT_REFLECTION_QUESTIONS)[number],
    )
  ) {
    return true;
  }

  return false;
}

export function isGoodNightFlowUserMessage(
  messages: Array<{ role: string; text: string; quickActionId?: string; flowVariant?: string }>,
  index: number,
): boolean {
  const message = messages[index];
  if (!message || message.role !== "user") return false;
  if (isGoodNightFlowMessage(message.quickActionId)) return true;
  if (message.flowVariant === "good-night") return true;
  return isGoodNightReflectionAnswerMessage(messages, index);
}

export function isGoodNightComposerMode(composerQuickActionId?: string | null): boolean {
  return composerQuickActionId === GOOD_NIGHT_ACTION_ID;
}

export function parseGoodNightShortcut(text: string): boolean {
  return /^\/gn\s*$/i.test(text.trim());
}

export function getGoodNightReflectionQuestion(index: number): string {
  return GOOD_NIGHT_REFLECTION_QUESTIONS[index] ?? GOOD_NIGHT_REFLECTION_QUESTIONS.at(-1)!;
}

export function getGoodNightReflectionPlaceholder(index: number): string {
  const placeholders = [
    "What went well — wins, progress, moments that felt right…",
    "Where you fell short — honestly, without beating yourself up…",
    "What challenged you — friction, surprises, hard moments…",
    "How you'll approach things differently tomorrow…",
    "Wins to remember — keep at least one, even on a hard day…",
  ] as const;
  return placeholders[index] ?? placeholders.at(-1)!;
}

export function serializeGoodNightReflectionAnswers(answers: string[]): string {
  if (answers.length !== GOOD_NIGHT_REFLECTION_COUNT) {
    throw new Error("Good night reflection requires five answers");
  }

  return JSON.stringify({
    version: 1,
    answers: GOOD_NIGHT_REFLECTION_SECTIONS.map((section, index) => ({
      section,
      raw: answers[index]?.trim() ?? "",
    })),
  });
}
