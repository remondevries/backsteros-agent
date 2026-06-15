import { describe, expect, test } from "bun:test";
import {
  dailyMonthKeyForToday,
  formatDailyMonthLabel,
  groupProjectDocumentsByMonth,
  groupVaultDailyEntriesByMonth,
  hasDailyJournalDocument,
  todayDailyJournalDateKey,
} from "./dailyDocumentMonthGroups";
import type { ProjectDocumentEntity } from "./documentStatusGroups";

describe("dailyDocumentMonthGroups", () => {
  test("formats month labels from YYYY-MM keys", () => {
    expect(formatDailyMonthLabel("2026-06")).toBe("June 2026");
    expect(formatDailyMonthLabel("unknown")).toBe("Other");
  });

  test("groups vault daily files by month from path or filename", () => {
    const groups = groupVaultDailyEntriesByMonth([
      {
        kind: "file",
        path: "Daily/2026-06-13.md",
        name: "2026-06-13.md",
        date: null,
      },
      {
        kind: "file",
        path: "Daily/2026-05-02.md",
        name: "2026-05-02.md",
        date: null,
      },
      {
        kind: "file",
        path: "Daily/notes.md",
        name: "notes.md",
        date: null,
      },
    ]);

    expect(groups.map((group) => group.key)).toEqual(["2026-06", "2026-05", "unknown"]);
    expect(groups[0]?.entries.map((entry) => entry.path)).toEqual(["Daily/2026-06-13.md"]);
    expect(groups[2]?.label).toBe("Other");
  });

  test("groups linear daily documents by month from title", () => {
    const doc = (title: string, updatedAt = ""): ProjectDocumentEntity => ({
      id: title,
      linearDocumentId: title,
      projectId: "team",
      projectName: "Daily",
      title,
      status: "Inbox",
      statusGroup: "Inbox",
      organization: "",
      owner: "",
      category: "Document",
      date: null,
      updatedAt,
    });

    const groups = groupProjectDocumentsByMonth([
      doc("2026-06-13"),
      doc("2026-06-01"),
      doc("2026-05-30"),
      doc("Untitled"),
    ]);

    expect(groups.map((group) => group.key)).toEqual(["2026-06", "2026-05", "unknown"]);
    expect(groups[0]?.entries.map((entry) => entry.title)).toEqual(["2026-06-13", "2026-06-01"]);
  });

  test("sorts daily journal documents by title date instead of updatedAt", () => {
    const doc = (title: string, updatedAt: string): ProjectDocumentEntity => ({
      id: title,
      linearDocumentId: title,
      projectId: "team",
      projectName: "Daily",
      title,
      status: "Inbox",
      statusGroup: "Inbox",
      organization: "",
      owner: "",
      category: "Document",
      date: null,
      updatedAt,
    });

    const groups = groupProjectDocumentsByMonth([
      doc("2026-06-01", "2026-06-14T12:00:00.000Z"),
      doc("2026-06-13", "2026-06-01T12:00:00.000Z"),
    ]);

    expect(groups[0]?.entries.map((entry) => entry.title)).toEqual(["2026-06-13", "2026-06-01"]);
  });

  test("dailyMonthKeyForToday matches UTC date key prefix", () => {
    expect(dailyMonthKeyForToday()).toMatch(/^\d{4}-\d{2}$/);
  });

  test("detects whether a daily journal document exists for a date key", () => {
    const doc = (title: string): ProjectDocumentEntity => ({
      id: title,
      linearDocumentId: title,
      projectId: "team",
      projectName: "Daily",
      title,
      status: "Inbox",
      statusGroup: "Inbox",
      organization: "",
      owner: "",
      category: "Document",
      date: null,
      updatedAt: "",
    });

    const today = todayDailyJournalDateKey(new Date("2026-06-14T12:00:00Z"));
    expect(today).toBe("2026-06-14");
    expect(
      hasDailyJournalDocument([doc("2026-06-13"), doc("2026-06-14")], "2026-06-14"),
    ).toBe(true);
    expect(hasDailyJournalDocument([doc("2026-06-13")], "2026-06-14")).toBe(false);
  });
});
