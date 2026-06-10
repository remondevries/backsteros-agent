import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  applyGoodMorningFeelDailyNote,
} from "./daily-note-automation.ts";
import {
  buildGoodMorningFeelResponse,
  buildYesterdayEncouragement,
  isUsablePolishedFeel,
  normalizePolishedFeelLine,
  polishFeelLocally,
  rateYesterdayDay,
  accumulateAssistantText,
} from "./good-morning-feel.ts";
import { readDailyNoteStats } from "./daily-note.ts";

describe("good morning feel helpers", () => {
  test("normalizes polished feel text", () => {
    expect(normalizePolishedFeelLine('feel: I feel rested today.')).toBe("I feel rested today.");
    expect(normalizePolishedFeelLine("```\nI slept deeply.\n```")).toBe("I slept deeply.");
  });

  test("rejects unusable polished feel values", () => {
    expect(isUsablePolishedFeel(".")).toBe(false);
    expect(isUsablePolishedFeel("I feel pretty good.")).toBe(true);
  });

  test("accumulates assistant stream chunks", () => {
    expect(accumulateAssistantText("I feel", " pretty good")).toBe("I feel pretty good");
    expect(accumulateAssistantText("I feel pretty", "I feel pretty good.")).toBe("I feel pretty good.");
  });

  test("local feel polish fallback", () => {
    expect(polishFeelLocally("i feel pretty good")).toBe("I feel pretty good.");
  });

  test("rates yesterday from whoop and productivity stats", () => {
    expect(
      rateYesterdayDay({
        sleep: 84,
        recovery: 82,
        strain: 5.8,
        productivity: 9,
      }),
    ).toBe("good");

    expect(
      rateYesterdayDay({
        sleep: 45,
        recovery: 28,
        strain: 16,
        productivity: 2,
      }),
    ).toBe("poor");

    expect(
      rateYesterdayDay({
        sleep: 72,
        recovery: 50,
        strain: 8,
        productivity: 5,
      }),
    ).toBe("mixed");
  });

  test("builds simple feel confirmation copy", () => {
    expect(buildYesterdayEncouragement("good")).toContain("Yesterday was a good day");
    expect(buildGoodMorningFeelResponse()).toBe("{{update:update|daily note}}");
  });

  test("writes feel line after slept in today's note", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "backster-feel-note-"));
    const notesPath = join(dataDir, "vault");
    mkdirSync(join(notesPath, "Daily"), { recursive: true });

    try {
      writeFileSync(
        join(notesPath, "Daily/2026-06-09.md"),
        `---\ndate: "2026-06-09"\nsleep: 78\nrecovery: 38\n---\n## Day log\nwoke: around 7:44 AM\nslept: 6h 14m\nweather: clear\n---\n`,
        "utf8",
      );

      const result = applyGoodMorningFeelDailyNote(
        notesPath,
        "I feel good this morning — I slept deep and wake up well rested.",
        { timezone: "UTC", now: new Date("2026-06-09T08:00:00Z") },
      );

      expect(result.lines).toEqual([
        "feel: I feel good this morning — I slept deep and wake up well rested.",
      ]);

      const stats = readDailyNoteStats(notesPath, "2026-06-08");
      expect(stats).toBeNull();
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});
