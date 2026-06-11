import { describe, expect, test } from "bun:test";
import {
  applyGoodMorningWakeDailyNote,
  applyMorningReviewDailyNote,
} from "./daily-note-automation.ts";
import {
  formatWakeTimeDayLogValue,
  parseWakeTimeFromAnswer,
  runGoodMorningWakeFlow,
} from "./good-morning-wake.ts";

describe("parseWakeTimeFromAnswer", () => {
  test("parses common wake time answers", () => {
    expect(parseWakeTimeFromAnswer("7:15 AM")).toBe("around 7:15 AM");
    expect(parseWakeTimeFromAnswer("7:15am")).toBe("around 7:15 AM");
    expect(parseWakeTimeFromAnswer("I woke up at 6:45")).toBe("around 6:45 AM");
    expect(parseWakeTimeFromAnswer("around 8 am")).toBe("around 8:00 AM");
    expect(parseWakeTimeFromAnswer("0730")).toBe("around 7:30 AM");
  });

  test("rejects invalid wake time answers", () => {
    expect(parseWakeTimeFromAnswer("")).toBeNull();
    expect(parseWakeTimeFromAnswer("not a time")).toBeNull();
    expect(parseWakeTimeFromAnswer("25:00")).toBeNull();
  });
});

describe("formatWakeTimeDayLogValue", () => {
  test("formats noon and midnight correctly", () => {
    expect(formatWakeTimeDayLogValue(0, 0)).toBe("around 12:00 AM");
    expect(formatWakeTimeDayLogValue(12, 0)).toBe("around 12:00 PM");
    expect(formatWakeTimeDayLogValue(13, 5)).toBe("around 1:05 PM");
  });
});

describe("good morning wake flow", () => {
  test("writes woke line after morning review metrics", () => {
    const { mkdtempSync, rmSync, readFileSync } = require("node:fs");
    const { join } = require("node:path");
    const { tmpdir } = require("node:os");

    const dataDir = mkdtempSync(join(tmpdir(), "backster-wake-note-"));
    const notesPath = join(dataDir, "vault");

    try {
      applyMorningReviewDailyNote(notesPath, {
        whoop: {
          id: "whoop-2026-06-08",
          date: "2026-06-08",
          sleepDuration: "7h 32m",
          sleepPerformance: 84,
          recoveryScore: 82,
          recoveryState: "GREEN",
          strainScore: 4.2,
        },
        weather: {
          locationLabel: "Leeuwarden, Netherlands",
          description: "partly cloudy",
          temperatureC: 12,
        },
        timezone: "UTC",
        now: new Date("2026-06-08T07:15:00Z"),
      });

      const result = runGoodMorningWakeFlow(notesPath, "6:30 AM", {
        timezone: "UTC",
        now: new Date("2026-06-08T07:15:00Z"),
      });

      expect(result.wakeTime).toBe("around 6:30 AM");
      expect(result.response).toBe("{{update:update|daily note}}");

      const content = readFileSync(join(notesPath, result.dailyNoteUpdate.path), "utf8");
      expect(content).toContain("woke: around 6:30 AM");
      expect(content).toContain("slept: 7h 32m");
      expect(content.indexOf("woke:")).toBeLessThan(content.indexOf("slept:"));
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });

  test("applyGoodMorningWakeDailyNote inserts before slept when bedtime is missing", () => {
    const { mkdtempSync, rmSync, readFileSync } = require("node:fs");
    const { join } = require("node:path");
    const { tmpdir } = require("node:os");

    const dataDir = mkdtempSync(join(tmpdir(), "backster-wake-only-note-"));
    const notesPath = join(dataDir, "vault");

    try {
      applyMorningReviewDailyNote(notesPath, {
        whoop: {
          id: "whoop-2026-06-08",
          date: "2026-06-08",
          sleepDuration: "7h 32m",
        },
        weather: null,
        timezone: "UTC",
        now: new Date("2026-06-08T07:15:00Z"),
      });

      const result = applyGoodMorningWakeDailyNote(notesPath, "around 6:30 AM", {
        timezone: "UTC",
        now: new Date("2026-06-08T07:15:00Z"),
      });

      const content = readFileSync(join(notesPath, result.path), "utf8");
      expect(content).toContain("woke: around 6:30 AM");
      expect(content).toContain("slept: 7h 32m");
      expect(content.indexOf("woke:")).toBeLessThan(content.indexOf("slept:"));
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});
