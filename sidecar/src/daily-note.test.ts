import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  appendDayLogLine,
  DAY_LOG_HEADING,
  DAY_LOG_STUB,
  defaultDailyNoteContent,
  ensureDailyNoteJournalStructure,
  ensureTodayDailyNote,
  formatDateInTimezone,
  formatMetricValue,
  getDailyNoteRelativePath,
  getTodayDailyNote,
  resolveTodayDailyNoteInfo,
  splitFrontmatter,
  updateTodayDailyNoteStrain,
  upsertFrontmatterFields,
  upsertMetricAfterInDayLog,
  upsertMetricInDayLog,
  upsertMetricLine,
} from "./daily-note.ts";

let dataDir = "";
let notesPath = "";
let previousDataDir: string | undefined;

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), "backster-daily-note-"));
  notesPath = join(dataDir, "vault");
  previousDataDir = process.env.BACKSTER_DATA_DIR;
  process.env.BACKSTER_DATA_DIR = join(dataDir, "config");
});

afterAll(() => {
  if (previousDataDir === undefined) {
    delete process.env.BACKSTER_DATA_DIR;
  } else {
    process.env.BACKSTER_DATA_DIR = previousDataDir;
  }
  rmSync(dataDir, { recursive: true, force: true });
});

describe("daily note helpers", () => {
  test("formats YYYY-MM-DD in timezone", () => {
    expect(formatDateInTimezone("UTC", new Date("2026-06-08T12:00:00Z"))).toBe("2026-06-08");
  });

  test("builds Daily/YYYY-MM-DD.md path", () => {
    expect(getDailyNoteRelativePath("2026-06-08")).toBe("Daily/2026-06-08.md");
  });

  test("resolveTodayDailyNoteInfo uses profile timezone fallback", () => {
    const info = resolveTodayDailyNoteInfo("Europe/Amsterdam", new Date("2026-06-08T10:00:00Z"));
    expect(info.path).toBe("Daily/2026-06-08.md");
    expect(info.weekday).toBeTruthy();
  });

  test("creates daily note when requested", () => {
    const result = getTodayDailyNote(notesPath, {
      timezone: "UTC",
      now: new Date("2026-06-09T12:00:00Z"),
      createIfMissing: true,
      includeContent: true,
    });

    expect(result.created).toBe(true);
    expect(result.path).toBe("Daily/2026-06-09.md");
    expect(existsSync(join(notesPath, result.path))).toBe(true);
    const content = readFileSync(join(notesPath, result.path), "utf8");
    expect(content).toContain('date: "2026-06-09"');
    expect(content).not.toContain("# 2026-06-09");
    expect(content).toContain("## Day log");
    expect(content).toContain(DAY_LOG_STUB);
    expect(content).not.toMatch(/---\n\n## Day log/);
    expect(content).toMatch(/---\n## Day log\n- xx\n$/);
    expect(content).not.toMatch(/## Day log\n- xx\n---\n$/);
  });

  test("ensureTodayDailyNote creates today's note when missing", () => {
    const first = ensureTodayDailyNote(notesPath, {
      timezone: "UTC",
      now: new Date("2026-06-10T12:00:00Z"),
    });
    expect(first.created).toBe(true);
    expect(first.path).toBe("Daily/2026-06-10.md");

    const second = ensureTodayDailyNote(notesPath, {
      timezone: "UTC",
      now: new Date("2026-06-10T12:00:00Z"),
    });
    expect(second.created).toBe(false);
    expect(second.exists).toBe(true);
  });

  test("compacts day log spacing and drops stub when metrics are written", () => {
    const loose = `---\ndate: "2026-06-09"\n---\n\n## Day log\n\n- xx\n\nwoke: around 7:44 AM\n\n---\n`;
    const compact = ensureDailyNoteJournalStructure(loose, "2026-06-09");

    expect(compact).toMatch(
      /---\ndate: "2026-06-09"\n---\n## Day log\nwoke: around 7:44 AM\n$/,
    );
    expect(compact).not.toContain("- xx");
    expect(compact).not.toMatch(/\n\n/);
  });

  test("preserves frontmatter when adding journal structure", () => {
    const migrated = ensureDailyNoteJournalStructure(
      '---\ndate: "2026-06-08"\nsleep: 78\nrecovery: 32\nstrain: 5.8\n---\n',
      "2026-06-08",
    );

    expect(migrated).toContain('date: "2026-06-08"');
    expect(migrated).toContain("sleep: 78");
    expect(migrated).toContain("## Day log");
    expect(migrated.indexOf("sleep: 78")).toBeLessThan(migrated.indexOf("## Day log"));
  });

  test("upserts whoop fields in frontmatter", () => {
    const updated = upsertFrontmatterFields(
      '---\ndate: "2026-06-08"\n---\n',
      { sleep: 84, recovery: 82, strain: "4.2" },
      "2026-06-08",
    );

    expect(updated).toContain('date: "2026-06-08"');
    expect(updated).toContain("sleep: 84");
    expect(updated).toContain("recovery: 82");
    expect(updated).toContain("strain: 4.2");
    expect(splitFrontmatter(updated).body).toBe("");
  });

  test("appends capture lines inside the day log section", () => {
    const date = "2026-06-11";
    const base = defaultDailyNoteContent(date);
    const withMetrics = upsertMetricInDayLog(base, "woke", "around 7:00 AM", date);
    const updated = appendDayLogLine(
      withMetrics,
      "- 17:00 — shipped good night automation",
      date,
    );

    expect(updated).toContain("woke: around 7:00 AM");
    expect(updated).toContain("- 17:00 — shipped good night automation");
    const dayLogStart = updated.indexOf("## Day log");
    expect(updated.indexOf("- 17:00")).toBeGreaterThan(dayLogStart);
    expect(updated).not.toMatch(/weather:[^\n]*\n---\n/);
  });

  test("migrates legacy notes into journal structure", () => {
    const migrated = ensureDailyNoteJournalStructure("# 2026-06-12\n\nwoke: around 8:00 AM\n", "2026-06-12");
    expect(migrated).not.toContain("# 2026-06-12");
    expect(migrated).toContain("## Day log");
    expect(migrated).toContain("woke: around 8:00 AM");
    expect(migrated).not.toMatch(/## Day log\nwoke:[^\n]+\n---\n$/);
  });

  test("removes legacy day log divider and keeps evening reflection", () => {
    const legacy = `---\ndate: "2026-06-09"\n---\n## Day log\nwoke: around 7:44 AM\nweather: clear\n---\n## Evening reflection\n### What went well\n- shipped\n`;
    const migrated = ensureDailyNoteJournalStructure(legacy, "2026-06-09");

    expect(migrated).toMatch(/weather: clear\n## Evening reflection/);
    expect(migrated).not.toMatch(/weather: clear\n---\n/);
  });

  test("inserts feel after slept in day log", () => {
    const date = "2026-06-13";
    const base = defaultDailyNoteContent(date);
    const withMetrics = [
      ["woke", "around 7:15 AM"],
      ["slept", "7h 32m"],
      ["weather", "partly cloudy, 12°C in Leeuwarden, Netherlands"],
    ].reduce(
      (content, [metric, value]) => upsertMetricInDayLog(content, metric, value, date),
      base,
    );

    const updated = upsertMetricAfterInDayLog(
      withMetrics,
      "feel",
      "Rested and clear-headed after a solid night.",
      "slept",
      date,
    );

    expect(updated).toContain("slept: 7h 32m");
    expect(updated).toContain("feel: Rested and clear-headed after a solid night.");
    expect(updated).toContain("weather: partly cloudy, 12°C in Leeuwarden, Netherlands");
    expect(updated.indexOf("slept:")).toBeLessThan(updated.indexOf("feel:"));
    expect(updated.indexOf("feel:")).toBeLessThan(updated.indexOf("weather:"));
    expect(updated).not.toMatch(/weather:[^\n]*\n---\n/);
  });

  test("upserts strain line in place", () => {
    expect(upsertMetricLine("sleep: 85%\nstrain: 4.2\n", "strain", "8.1")).toBe(
      "sleep: 85%\nstrain: 8.1\n",
    );
    expect(upsertMetricLine("# 2026-06-09\n", "strain", "8.1")).toBe("# 2026-06-09\nstrain: 8.1\n");
  });

  test("updates today daily note strain", () => {
    const result = updateTodayDailyNoteStrain(notesPath, 12.4, {
      timezone: "UTC",
      now: new Date("2026-06-10T21:00:00Z"),
      createIfMissing: true,
    });

    expect(result.path).toBe("Daily/2026-06-10.md");
    expect(result.strainLine).toBe("strain: 12.4");
    const content = readFileSync(join(notesPath, result.path), "utf8");
    expect(content).toContain("strain: 12.4");
    expect(content.indexOf("strain: 12.4")).toBeLessThan(content.indexOf("## Day log"));
  });

  test("formats metric values with one decimal", () => {
    expect(formatMetricValue(12)).toBe("12");
    expect(formatMetricValue(12.45)).toBe("12.5");
  });
});
