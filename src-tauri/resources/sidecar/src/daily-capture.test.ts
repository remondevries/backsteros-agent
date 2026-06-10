import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { applyDailyCaptureDailyNote } from "./daily-note-automation.ts";
import {
  buildDailyCaptureResponse,
  formatDailyCaptureLogEntry,
  formatDailyCaptureLogTime,
  isDailyCaptureQuickAction,
} from "./daily-capture.ts";

describe("daily capture", () => {
  test("recognizes daily capture quick action", () => {
    expect(isDailyCaptureQuickAction("daily-capture")).toBe(true);
    expect(isDailyCaptureQuickAction("good-morning")).toBe(false);
  });

  test("formats log entries with time and message", () => {
    const entry = formatDailyCaptureLogEntry("shipped the daily capture flow", "UTC", {
      now: new Date("2026-06-10T17:00:00.000Z"),
    });
    expect(entry).toBe("- 17:00 — shipped the daily capture flow");
    expect(formatDailyCaptureLogTime("UTC", new Date("2026-06-10T17:00:00.000Z"))).toBe("17:00");
  });

  test("formats log entries with a custom log time", () => {
    const entry = formatDailyCaptureLogEntry("backdated note", "UTC", { logTime: "9:05" });
    expect(entry).toBe("- 09:05 — backdated note");
  });

  test("builds confirmation token", () => {
    const response = buildDailyCaptureResponse();
    expect(response).toContain("{{update:entry|daily log|");
    expect(response).toContain("Thanks, I added this to your daily log.");
  });

  test("writes capture lines into today's note", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "backster-dc-"));
    const notesPath = join(dataDir, "vault");
    mkdirSync(join(notesPath, "Daily"), { recursive: true });

    try {
      writeFileSync(
        join(notesPath, "Daily", "2026-06-10.md"),
        "---\ndate: 2026-06-10\n---\n## Day log\nwoke: around 7:00 AM\n",
        "utf8",
      );

      const result = applyDailyCaptureDailyNote(notesPath, "Checked in with the team", {
        timezone: "UTC",
        now: new Date("2026-06-10T17:00:00.000Z"),
      });

      const content = readFileSync(join(notesPath, result.path), "utf8");
      expect(content).toContain("- 17:00 — Checked in with the team");
      expect(result.lines).toEqual(["- 17:00 — Checked in with the team"]);
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });

  test("writes capture lines with a custom log time", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "backster-dc-time-"));
    const notesPath = join(dataDir, "vault");
    mkdirSync(join(notesPath, "Daily"), { recursive: true });

    try {
      writeFileSync(
        join(notesPath, "Daily", "2026-06-10.md"),
        "---\ndate: 2026-06-10\n---\n## Day log\n",
        "utf8",
      );

      const result = applyDailyCaptureDailyNote(notesPath, "Morning retro", {
        timezone: "UTC",
        now: new Date("2026-06-10T17:00:00.000Z"),
        logTime: "08:30",
      });

      const content = readFileSync(join(notesPath, result.path), "utf8");
      expect(content).toContain("- 08:30 — Morning retro");
      expect(result.lines).toEqual(["- 08:30 — Morning retro"]);
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});
