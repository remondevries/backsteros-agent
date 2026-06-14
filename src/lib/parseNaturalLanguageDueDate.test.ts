import { describe, expect, test } from "bun:test";
import {
  naturalLanguageDueDatePreview,
  parseNaturalLanguageDueDate,
} from "./parseNaturalLanguageDueDate";

const ref = new Date(2026, 5, 13, 10, 0, 0); // Fri Jun 13, 2026

describe("parseNaturalLanguageDueDate", () => {
  test("parses relative phrases", () => {
    expect(parseNaturalLanguageDueDate("tomorrow", ref)).toMatchObject({
      kind: "date",
      ymd: "2026-06-14",
      label: "Tomorrow",
    });
    expect(parseNaturalLanguageDueDate("next friday", ref)).toMatchObject({
      kind: "date",
      ymd: "2026-06-19",
    });
    expect(parseNaturalLanguageDueDate("in 2 weeks", ref)).toMatchObject({
      kind: "date",
      ymd: "2026-06-27",
    });
  });

  test("parses ISO dates and clear phrases", () => {
    expect(parseNaturalLanguageDueDate("2026-12-25", ref)).toMatchObject({
      kind: "date",
      ymd: "2026-12-25",
    });
    expect(parseNaturalLanguageDueDate("no due date", ref)).toEqual({ kind: "clear" });
    expect(parseNaturalLanguageDueDate("clear", ref)).toEqual({ kind: "clear" });
  });

  test("returns invalid for empty or unparseable input", () => {
    expect(parseNaturalLanguageDueDate("", ref)).toEqual({ kind: "invalid" });
    expect(parseNaturalLanguageDueDate("asdfghjkl", ref)).toEqual({ kind: "invalid" });
  });

  test("builds preview labels", () => {
    expect(naturalLanguageDueDatePreview("tomorrow", ref)).toBe("Set to Tomorrow");
    expect(naturalLanguageDueDatePreview("no due date", ref)).toBe("Clear due date");
    expect(naturalLanguageDueDatePreview("not a date", ref)).toBeNull();
  });
});
