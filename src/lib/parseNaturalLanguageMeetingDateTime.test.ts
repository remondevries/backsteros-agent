import { describe, expect, test } from "bun:test";
import {
  naturalLanguageMeetingDateTimePreview,
  parseNaturalLanguageMeetingDateTime,
} from "./parseNaturalLanguageMeetingDateTime";

const ref = new Date(2026, 5, 13, 10, 0, 0); // Fri Jun 13, 2026

describe("parseNaturalLanguageMeetingDateTime", () => {
  test("parses date and time phrases", () => {
    expect(parseNaturalLanguageMeetingDateTime("today at 4pm", ref)).toMatchObject({
      kind: "datetime",
      date: "2026-06-13",
      time: "16:00",
    });
    expect(parseNaturalLanguageMeetingDateTime("Today at 16:00", ref)).toMatchObject({
      kind: "datetime",
      date: "2026-06-13",
      time: "16:00",
    });
    expect(parseNaturalLanguageMeetingDateTime("tomorrow at 9am", ref)).toMatchObject({
      kind: "datetime",
      date: "2026-06-14",
      time: "09:00",
    });
  });

  test("parses date-only phrases without time", () => {
    expect(parseNaturalLanguageMeetingDateTime("tomorrow", ref)).toMatchObject({
      kind: "datetime",
      date: "2026-06-14",
      time: null,
    });
    expect(parseNaturalLanguageMeetingDateTime("2026-12-25", ref)).toMatchObject({
      kind: "datetime",
      date: "2026-12-25",
      time: null,
    });
  });

  test("parses ISO date-time strings", () => {
    expect(parseNaturalLanguageMeetingDateTime("2026-12-25 16:00", ref)).toMatchObject({
      kind: "datetime",
      date: "2026-12-25",
      time: "16:00",
    });
  });

  test("parses clear phrases", () => {
    expect(parseNaturalLanguageMeetingDateTime("clear", ref)).toEqual({ kind: "clear" });
    expect(parseNaturalLanguageMeetingDateTime("no date", ref)).toEqual({ kind: "clear" });
  });

  test("returns invalid for empty or unparseable input", () => {
    expect(parseNaturalLanguageMeetingDateTime("", ref)).toEqual({ kind: "invalid" });
    expect(parseNaturalLanguageMeetingDateTime("asdfghjkl", ref)).toEqual({ kind: "invalid" });
  });

  test("builds preview labels", () => {
    expect(naturalLanguageMeetingDateTimePreview("today at 4pm", ref)).toMatch(/^Set to /);
    expect(naturalLanguageMeetingDateTimePreview("no date", ref)).toBe("Clear date and time");
    expect(naturalLanguageMeetingDateTimePreview("not a date", ref)).toBeNull();
  });
});
