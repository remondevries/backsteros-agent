import { describe, expect, test } from "bun:test";
import {
  applyGoodNightDailyNote,
  applyMorningReviewDailyNote,
  computeProductivityScore,
  formatGoodMorningFrontmatterFields,
  formatRecoveryFrontmatterValue,
  formatSleepFrontmatterValue,
  formatSleptDuration,
  formatStrainFrontmatterValue,
  formatWeatherMetric,
  formatWhoopFrontmatterFields,
} from "./daily-note-automation.ts";
import type { MorningReviewWeather } from "./morning-review-weather.ts";
import type { WhoopSnapshotEntity } from "./types.ts";

describe("daily note automation", () => {
  test("computes productivity score tiers", () => {
    expect(computeProductivityScore(0)).toBe(0);
    expect(computeProductivityScore(3)).toBe(3);
    expect(computeProductivityScore(5)).toBe(5);
    expect(computeProductivityScore(6)).toBe(5);
    expect(computeProductivityScore(10)).toBe(5);
    expect(computeProductivityScore(11)).toBe(9);
    expect(computeProductivityScore(15)).toBe(9);
    expect(computeProductivityScore(16)).toBe(10);
  });

  test("formats slept duration from whoop snapshot", () => {
    const whoop: WhoopSnapshotEntity = {
      id: "whoop-2026-06-08",
      date: "2026-06-08",
      sleepDuration: "7h 32m",
    };

    expect(formatSleptDuration(whoop)).toBe("7h 32m");
  });

  test("formats good morning frontmatter fields without strain", () => {
    const whoop: WhoopSnapshotEntity = {
      id: "whoop-2026-06-08",
      date: "2026-06-08",
      sleepPerformance: 84.2,
      recoveryScore: 82.6,
      recoveryState: "GREEN",
      strainScore: 4.25,
    };

    expect(formatGoodMorningFrontmatterFields(whoop)).toEqual({
      sleep: 84,
      recovery: 83,
    });
  });

  test("formats full whoop frontmatter fields", () => {
    const whoop: WhoopSnapshotEntity = {
      id: "whoop-2026-06-08",
      date: "2026-06-08",
      sleepPerformance: 84.2,
      recoveryScore: 82.6,
      recoveryState: "GREEN",
      strainScore: 4.25,
    };

    expect(formatSleepFrontmatterValue(whoop)).toBe(84);
    expect(formatRecoveryFrontmatterValue(whoop)).toBe(83);
    expect(formatStrainFrontmatterValue(whoop)).toBe("4.3");
    expect(formatWhoopFrontmatterFields(whoop)).toEqual({
      sleep: 84,
      recovery: 83,
      strain: "4.3",
    });
  });

  test("formats weather metric line", () => {
    const weather: MorningReviewWeather = {
      locationLabel: "Leeuwarden, Netherlands",
      description: "partly cloudy",
      temperatureC: 12,
    };

    expect(formatWeatherMetric(weather)).toBe("partly cloudy, 12°C in Leeuwarden, Netherlands");
  });
});

describe("daily note automation writes", () => {
  test("morning review writes wake, sleep, and weather lines", () => {
    const { mkdtempSync, rmSync, readFileSync } = require("node:fs");
    const { join } = require("node:path");
    const { tmpdir } = require("node:os");

    const dataDir = mkdtempSync(join(tmpdir(), "backster-morning-note-"));
    const notesPath = join(dataDir, "vault");

    try {
      const result = applyMorningReviewDailyNote(notesPath, {
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

      const content = readFileSync(join(notesPath, result.path), "utf8");
      expect(content).toMatch(/^---\n/);
      expect(content).toContain('date: "2026-06-08"');
      expect(content).toContain("sleep: 84");
      expect(content).toContain("recovery: 82");
      expect(content).not.toContain("strain: 4.2");
      expect(content).toContain("## Day log");
      expect(content).toContain("woke: around 7:15 AM");
      expect(content).toContain("slept: 7h 32m");
      expect(content).toContain("weather: partly cloudy, 12°C in Leeuwarden, Netherlands");
      expect(content.indexOf("sleep: 84")).toBeLessThan(content.indexOf("## Day log"));
      expect(content.indexOf("slept:")).toBeLessThan(content.indexOf("weather:"));
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });

  test("good night writes bedtime, strain, and productivity", () => {
    const { mkdtempSync, rmSync, readFileSync } = require("node:fs");
    const { join } = require("node:path");
    const { tmpdir } = require("node:os");

    const dataDir = mkdtempSync(join(tmpdir(), "backster-good-night-note-"));
    const notesPath = join(dataDir, "vault");

    try {
      const result = applyGoodNightDailyNote(notesPath, {
        whoop: {
          id: "whoop-2026-06-08",
          date: "2026-06-08",
          strainScore: 12.4,
          recoveryScore: 71,
          recoveryState: "GREEN",
        },
        completedIssueCount: 11,
        timezone: "UTC",
        now: new Date("2026-06-08T22:30:00Z"),
      });

      const content = readFileSync(join(notesPath, result.path), "utf8");
      expect(content).toContain("## Day log");
      expect(content).toContain("bedtime: around 10:30 PM");
      expect(content).toContain("productivity: 9");
      expect(content).toContain("strain: 12.4");
      expect(content).toContain("recovery: 71");
      expect(content.indexOf("productivity: 9")).toBeLessThan(content.indexOf("## Day log"));
      expect(content.indexOf("bedtime:")).toBeGreaterThan(content.indexOf("## Day log"));
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});
