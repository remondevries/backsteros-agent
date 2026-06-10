import type { ModelSelection } from "@cursor/sdk";
import { createEphemeralAgent, disposeEphemeralAgent, sendPolishPrompt } from "./agent.ts";
import { isTestExecutionMode } from "./execution-mode.ts";
import { applyGoodMorningFeelDailyNote, type DailyNoteWriteResult } from "./daily-note-automation.ts";
import { buildUpdateConfirmationToken } from "./update-confirmation.ts";
import {
  formatDateInTimezone,
  readDailyNoteStats,
  type DailyNoteStats,
} from "./daily-note.ts";
import { loadUserTimezone } from "./context/profile.ts";

export const MORNING_FEEL_MEDITATIONS_STYLE = `[Morning feel writing style — apply ONLY to the feel line]
- First person ("I feel...", "I slept..."), not for an audience
- Honest and plain — name how you feel without dramatizing
- One or two short sentences; preserve the user's meaning
- Fix spelling and grammar; do not invent details`;

export const POLISH_FEEL_PROMPT = `[Good morning — polish feel line only]
Rewrite the user's answer into a single first-person feel line (one or two sentences).

${MORNING_FEEL_MEDITATIONS_STYLE}

Return ONLY the feel line text — no "feel:" prefix, no markdown, no commentary.`;

export interface YesterdayDayRating {
  rating: "good" | "mixed" | "poor" | "unknown";
  stats: DailyNoteStats | null;
  date: string | null;
}

export interface GoodMorningFeelFlowResult {
  polishedFeel: string;
  dailyNoteUpdate: DailyNoteWriteResult;
  response: string;
}

export function previousDateInTimezone(timezone: string, now = new Date()): string {
  return formatDateInTimezone(timezone, new Date(now.getTime() - 86_400_000));
}

export function normalizePolishedFeelLine(text: string): string {
  let line = text.trim();
  line = line.replace(/^```(?:\w+)?\s*/i, "").replace(/\s*```$/i, "").trim();
  line = line.replace(/^feel:\s*/i, "").trim();
  line = line.replace(/^["']|["']$/g, "").trim();
  return line.replace(/\s+/g, " ");
}

export function isUsablePolishedFeel(text: string): boolean {
  const normalized = normalizePolishedFeelLine(text);
  if (normalized.length < 4) return false;
  if (/^[.!?,;:]+$/.test(normalized)) return false;
  return /[a-zA-Z]/.test(normalized);
}

export function polishFeelLocally(rawAnswer: string): string {
  let line = normalizePolishedFeelLine(rawAnswer);
  if (!line) return line;
  line = line.charAt(0).toUpperCase() + line.slice(1);
  if (!/[.!?]$/.test(line)) {
    line += ".";
  }
  return line;
}

export function accumulateAssistantText(previous: string, chunk: string): string {
  if (!chunk) return previous;
  if (!previous) return chunk;

  // Fast paths for the common streaming patterns where one side fully extends the other.
  if (chunk.startsWith(previous)) return chunk;
  if (previous.startsWith(chunk)) return previous;

  // If the new chunk is already contained, keep the longer previous text.
  if (previous.includes(chunk)) return previous;
  if (chunk.includes(previous)) return chunk;

  // Generic overlap: stream chunks sometimes overlap on a suffix/prefix boundary
  // (e.g. "...pre" + "pretty..."). Dedupe via the longest overlap.
  const maxOverlap = Math.min(previous.length, chunk.length);
  for (let overlap = maxOverlap; overlap >= 1; overlap--) {
    const overlapPrefix = chunk.slice(0, overlap);
    if (previous.endsWith(overlapPrefix)) {
      return `${previous}${chunk.slice(overlap)}`;
    }
  }

  return `${previous}${chunk}`;
}

export function scoreMetric(
  metric: keyof DailyNoteStats,
  value: number | null,
): "good" | "neutral" | "bad" | "missing" {
  if (value == null) return "missing";

  switch (metric) {
    case "sleep":
      if (value >= 70) return "good";
      if (value < 50) return "bad";
      return "neutral";
    case "recovery":
      if (value >= 67) return "good";
      if (value < 34) return "bad";
      return "neutral";
    case "strain":
      if (value > 18) return "bad";
      if (value >= 0) return "good";
      return "neutral";
    case "productivity":
      if (value >= 9) return "good";
      if (value <= 3) return "bad";
      return "neutral";
    default:
      return "neutral";
  }
}

export function rateYesterdayDay(stats: DailyNoteStats | null): YesterdayDayRating["rating"] {
  if (!stats) return "unknown";

  const scores = (
    ["sleep", "recovery", "strain", "productivity"] as const
  ).map((metric) => scoreMetric(metric, stats[metric]));

  const present = scores.filter((score) => score !== "missing");
  if (present.length === 0) return "unknown";

  const badCount = present.filter((score) => score === "bad").length;
  const goodCount = present.filter((score) => score === "good").length;

  if (badCount >= 2) return "poor";
  if (goodCount === present.length) return "good";
  if (goodCount >= Math.ceil(present.length * 0.75) && badCount === 0) return "good";
  if (badCount >= 1) return "mixed";
  return "mixed";
}

export function buildYesterdayEncouragement(rating: YesterdayDayRating["rating"]): string {
  switch (rating) {
    case "good":
      return "Yesterday was a good day — let's do it again today.";
    case "mixed":
      return "Yesterday had its ups and downs — see if you can do a little better today.";
    case "poor":
      return "Yesterday was a harder day — today's a fresh start.";
    default:
      return "Make today count.";
  }
}

export function buildGoodMorningFeelResponse(): string {
  return buildUpdateConfirmationToken("update", "daily note");
}

export function loadYesterdayDayRating(
  notesPath: string,
  timezone = loadUserTimezone(),
  now = new Date(),
): YesterdayDayRating {
  const date = previousDateInTimezone(timezone, now);
  const stats = readDailyNoteStats(notesPath, date);
  return {
    rating: rateYesterdayDay(stats),
    stats,
    date: stats ? date : null,
  };
}

export async function polishFeelWithAgent(
  notesPath: string,
  rawAnswer: string,
  model: ModelSelection,
): Promise<string> {
  const prompt = `${POLISH_FEEL_PROMPT}\n\nUser's raw answer:\n${rawAnswer.trim()}`;
  const agent = await createEphemeralAgent(notesPath, model);

  try {
    const run = await sendPolishPrompt(agent, prompt, model);

    let accumulated = "";
    for await (const message of run.stream()) {
      if (message.type !== "assistant") continue;
      const chunk = message.message.content
        .filter((block): block is { type: "text"; text: string } => block.type === "text")
        .map((block) => block.text)
        .join("");
      accumulated = accumulateAssistantText(accumulated, chunk);
    }

    const result = await run.wait();
    if (result.status !== "finished") {
      throw new Error("Feel polish did not finish");
    }

    const polished = normalizePolishedFeelLine(accumulated.trim() || result.result?.trim() || "");
    if (!isUsablePolishedFeel(polished)) {
      throw new Error("Feel polish returned unusable text");
    }

    return polished;
  } finally {
    await disposeEphemeralAgent(agent);
  }
}

export async function runGoodMorningFeelFlow(
  notesPath: string,
  rawAnswerInput: string,
  options: {
    model?: ModelSelection;
    timezone?: string;
    now?: Date;
  } = {},
): Promise<GoodMorningFeelFlowResult> {
  const timezone = options.timezone ?? loadUserTimezone();
  const now = options.now ?? new Date();
  const rawAnswer = rawAnswerInput.trim();

  if (!rawAnswer) {
    throw new Error("Feel answer is empty");
  }

  let polishedFeel = polishFeelLocally(rawAnswer);
  if (!isTestExecutionMode() && options.model) {
    try {
      const candidate = await polishFeelWithAgent(notesPath, rawAnswer, options.model);
      if (isUsablePolishedFeel(candidate)) {
        // Ensure agent output gets the same final formatting guarantees as the local fallback
        // (capitalization + trailing punctuation).
        polishedFeel = polishFeelLocally(candidate);
      }
    } catch {
      // Keep local polish fallback.
    }
  }

  if (!isUsablePolishedFeel(polishedFeel)) {
    throw new Error("Could not polish feel answer");
  }

  const dailyNoteUpdate = applyGoodMorningFeelDailyNote(notesPath, polishedFeel, {
    timezone,
    now,
  });

  return {
    polishedFeel,
    dailyNoteUpdate,
    response: buildGoodMorningFeelResponse(),
  };
}
