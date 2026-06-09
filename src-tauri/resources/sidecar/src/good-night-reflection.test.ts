import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { applyGoodNightReflectionDailyNote } from "./daily-note-automation.ts";
import {
  buildEveningReflectionMarkdownLocally,
  buildGoodNightReflectionResponse,
  isUsablePolishedReflection,
  normalizePolishedReflectionMarkdown,
  parseGoodNightReflectionPayload,
  polishReflectionSectionLocally,
} from "./good-night-reflection.ts";
import { GOOD_NIGHT_REFLECTION_SECTIONS } from "./good-night-sections.ts";

describe("good night reflection helpers", () => {
  test("parses reflection payload JSON", () => {
    const payload = JSON.stringify({
      version: 1,
      answers: GOOD_NIGHT_REFLECTION_SECTIONS.map((section, index) => ({
        section,
        raw: `Answer ${index + 1}`,
      })),
    });

    const parsed = parseGoodNightReflectionPayload(payload);
    expect(parsed.answers).toHaveLength(5);
    expect(parsed.answers[0]?.raw).toBe("Answer 1");
  });

  test("polishes reflection bullets locally", () => {
    expect(polishReflectionSectionLocally("shipped the feature\nfixed a bug")).toBe(
      "- Shipped the feature.\n- Fixed a bug.",
    );
  });

  test("normalizes agent markdown with code fences", () => {
    const normalized = normalizePolishedReflectionMarkdown(
      "```markdown\n## Evening reflection\n### What went well\n- I made progress.\n```",
    );
    expect(normalized.startsWith("## Evening reflection")).toBe(true);
  });

  test("rejects unchanged copy-paste polish", () => {
    const answers = GOOD_NIGHT_REFLECTION_SECTIONS.map((section) => ({
      section,
      raw: `Raw answer for ${section}`,
    }));
    const local = buildEveningReflectionMarkdownLocally(answers);
    expect(isUsablePolishedReflection(local, answers)).toBe(false);
  });

  test("builds evening reflection markdown locally", () => {
    const markdown = buildEveningReflectionMarkdownLocally([
      { section: "What went well", raw: "Made progress on the project" },
      { section: "Where I fell short", raw: "Skipped exercise" },
      { section: "What challenged me", raw: "A tough meeting" },
      { section: "How I'll approach it differently", raw: "Block time earlier" },
      { section: "Wins to remember", raw: "Helped a teammate" },
    ]);

    expect(markdown).toContain("## Evening reflection");
    expect(markdown).toContain("### What went well");
    expect(markdown).toContain("- Made progress on the project.");
  });

  test("builds good night closing response", () => {
    expect(buildGoodNightReflectionResponse("Remon")).toContain("Good night, Remon");
    expect(buildGoodNightReflectionResponse("Remon")).toContain("evening reflection");
  });

  test("writes evening reflection into today's note", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "backster-gn-reflect-"));
    const notesPath = join(dataDir, "vault");
    mkdirSync(join(notesPath, "Daily"), { recursive: true });

    try {
      writeFileSync(
        join(notesPath, "Daily", "2026-06-08.md"),
        [
          "---",
          "date: 2026-06-08",
          "bedtime: 22:30",
          "---",
          "",
          "## Day log",
          "",
          "- Evening check-in",
        ].join("\n"),
      );

      const reflection = buildEveningReflectionMarkdownLocally([
        { section: "What went well", raw: "Finished the review" },
        { section: "Where I fell short", raw: "Late start" },
        { section: "What challenged me", raw: "Context switching" },
        { section: "How I'll approach it differently", raw: "Morning focus block" },
        { section: "Wins to remember", raw: "Good team sync" },
      ]);

      const result = applyGoodNightReflectionDailyNote(notesPath, reflection, {
        timezone: "UTC",
        now: new Date("2026-06-08T21:00:00.000Z"),
      });

      const content = readFileSync(join(notesPath, result.path), "utf8");
      expect(content).toContain("## Evening reflection");
      expect(content).toContain("### What went well");
      expect(content).toContain("- Finished the review.");
      expect(content).toContain("## Day log");
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});
