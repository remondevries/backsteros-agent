import type { SDKAgent, ModelSelection } from "@cursor/sdk";
import { createEphemeralAgent, disposeEphemeralAgent, sendPolishPrompt } from "./agent.ts";
import { loadUserFirstName, loadUserTimezone } from "./context/profile.ts";
import {
  applyGoodNightReflectionDailyNote,
  type DailyNoteWriteResult,
} from "./daily-note-automation.ts";
import { accumulateAssistantText } from "./good-morning-feel.ts";
import {
  GOOD_NIGHT_MEDITATIONS_STYLE,
  GOOD_NIGHT_REFLECTION_SECTIONS,
} from "./good-night-sections.ts";

export {
  GOOD_NIGHT_REFLECTION_SECTIONS,
  type GoodNightReflectionSection,
} from "./good-night-sections.ts";

export interface GoodNightReflectionAnswer {
  section: GoodNightReflectionSection;
  raw: string;
}

export interface GoodNightReflectionPayload {
  version: 1;
  answers: GoodNightReflectionAnswer[];
}

export const POLISH_REFLECTION_PROMPT = `[Good night — rewrite evening reflection]
You are rewriting the user's spoken answers into their daily note evening reflection.

IMPORTANT:
- Rewrite in your own words — do NOT copy their sentences verbatim
- First person throughout ("I...", "My...")
- Fix spelling and grammar; preserve meaning; do not invent events
- Use 2–5 bullet points per section when they gave enough detail; one clear sentence when brief

Return ONLY markdown starting with "## Evening reflection" and these ### subsections in order:
${GOOD_NIGHT_REFLECTION_SECTIONS.map((title) => `- ### ${title}`).join("\n")}

${GOOD_NIGHT_MEDITATIONS_STYLE}

No preamble, no commentary, no code fences — markdown only.`;

export function parseGoodNightReflectionPayload(text: string): GoodNightReflectionPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.trim());
  } catch {
    throw new Error("Good night reflection payload is not valid JSON");
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("answers" in parsed) ||
    !Array.isArray((parsed as GoodNightReflectionPayload).answers)
  ) {
    throw new Error("Good night reflection payload is missing answers");
  }

  const answers = (parsed as GoodNightReflectionPayload).answers;
  if (answers.length !== GOOD_NIGHT_REFLECTION_SECTIONS.length) {
    throw new Error("Good night reflection requires five answers");
  }

  return {
    version: 1,
    answers: GOOD_NIGHT_REFLECTION_SECTIONS.map((section, index) => {
      const entry = answers[index];
      const raw =
        typeof entry === "object" &&
        entry &&
        "raw" in entry &&
        typeof (entry as GoodNightReflectionAnswer).raw === "string"
          ? (entry as GoodNightReflectionAnswer).raw.trim()
          : typeof entry === "string"
            ? entry.trim()
            : "";
      if (!raw) {
        throw new Error(`Good night reflection answer for "${section}" is empty`);
      }
      return { section, raw };
    }),
  };
}

export function normalizePolishedReflectionMarkdown(text: string): string {
  let markdown = text.trim();
  markdown = markdown
    .replace(/^```(?:markdown|md)?\s*\n/i, "")
    .replace(/\n```\s*$/i, "")
    .trim();

  const match = markdown.match(/^#{1,2}\s+Evening reflection/im);
  if (match?.index != null && match.index > 0) {
    markdown = markdown.slice(match.index);
  }

  if (!/^##\s+Evening reflection/im.test(markdown)) {
    markdown = markdown.replace(/^#\s+Evening reflection/im, "## Evening reflection");
  }

  return markdown.trim();
}

export function isUsablePolishedReflection(
  markdown: string,
  answers: GoodNightReflectionAnswer[],
): boolean {
  const normalized = normalizePolishedReflectionMarkdown(markdown);
  if (!/^##\s+Evening reflection/im.test(normalized)) {
    return false;
  }

  for (const section of GOOD_NIGHT_REFLECTION_SECTIONS) {
    if (!normalized.includes(`### ${section}`)) {
      return false;
    }
  }

  const local = buildEveningReflectionMarkdownLocally(answers);
  if (normalized.replace(/\s+/g, " ") === local.replace(/\s+/g, " ")) {
    return false;
  }

  const rawChunks = answers
    .map((entry) => entry.raw.trim())
    .filter((entry) => entry.length >= 12);
  const polishedBody = normalized.toLowerCase();
  const verbatimMatches = rawChunks.filter((chunk) =>
    polishedBody.includes(chunk.toLowerCase()),
  ).length;

  return verbatimMatches < Math.max(1, Math.ceil(rawChunks.length * 0.75));
}

export function polishReflectionSectionLocally(raw: string): string {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return "- ";

  return lines
    .map((line) => {
      let text = line;
      if (text.startsWith("- ")) text = text.slice(2).trim();
      if (text.startsWith("* ")) text = text.slice(2).trim();
      if (text.length === 0) return "- ";
      text = text.charAt(0).toUpperCase() + text.slice(1);
      if (!/[.!?]$/.test(text)) {
        text += ".";
      }
      return `- ${text}`;
    })
    .join("\n");
}

export function buildEveningReflectionMarkdownLocally(
  answers: GoodNightReflectionAnswer[],
): string {
  const lines = ["## Evening reflection"];
  for (const entry of answers) {
    lines.push(`### ${entry.section}`);
    lines.push(polishReflectionSectionLocally(entry.raw));
  }
  return lines.join("\n");
}

export function buildReflectionPolishPrompt(answers: GoodNightReflectionAnswer[]): string {
  const body = answers
    .map((entry) => `### ${entry.section}\n${entry.raw}`)
    .join("\n\n");

  return `${POLISH_REFLECTION_PROMPT}\n\nUser's raw answers:\n${body}`;
}

export async function polishReflectionWithAgent(
  notesPath: string,
  answers: GoodNightReflectionAnswer[],
  model: ModelSelection,
): Promise<string> {
  const prompt = buildReflectionPolishPrompt(answers);
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
      throw new Error("Reflection polish did not finish");
    }

    const rawOutput = (accumulated.trim() || result.result?.trim() || "").trim();
    if (!rawOutput) {
      throw new Error("Reflection polish returned empty text");
    }

    const markdown = normalizePolishedReflectionMarkdown(rawOutput);
    if (!isUsablePolishedReflection(markdown, answers)) {
      throw new Error("Reflection polish returned invalid or unchanged markdown");
    }

    return markdown;
  } finally {
    await disposeEphemeralAgent(agent);
  }
}

export function buildGoodNightReflectionResponse(firstName?: string | null): string {
  const name = firstName ? `, ${firstName}` : "";
  return `Good night${name}. I've updated today's note with your evening reflection. Rest well.`;
}

export interface GoodNightReflectionFlowResult {
  reflectionMarkdown: string;
  dailyNoteUpdate: DailyNoteWriteResult;
  response: string;
}

export async function runGoodNightReflectionFlow(
  notesPath: string,
  payloadText: string,
  options: {
    agent: SDKAgent;
    model: ModelSelection;
    timezone?: string;
    now?: Date;
  },
): Promise<GoodNightReflectionFlowResult> {
  const payload = parseGoodNightReflectionPayload(payloadText);
  const timezone = options.timezone ?? loadUserTimezone();
  const now = options.now ?? new Date();

  let reflectionMarkdown = buildEveningReflectionMarkdownLocally(payload.answers);
  try {
    reflectionMarkdown = await polishReflectionWithAgent(
      notesPath,
      payload.answers,
      options.model,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not rewrite evening reflection: ${message}`);
  }

  const dailyNoteUpdate = applyGoodNightReflectionDailyNote(notesPath, reflectionMarkdown, {
    timezone,
    now,
  });

  return {
    reflectionMarkdown,
    dailyNoteUpdate,
    response: buildGoodNightReflectionResponse(loadUserFirstName()),
  };
}
