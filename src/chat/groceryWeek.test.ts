import { describe, expect, test } from "bun:test";
import {
  formatCurrentGroceryWeekNumber,
  formatGroceryLogEntry,
  normalizeGroceryWeekNumber,
  parseGroceryLogEntry,
} from "./groceryWeek";

describe("groceryWeek", () => {
  test("formats and parses grocery log entries", () => {
    expect(formatGroceryLogEntry("bananas", 12)).toBe("- 12 — bananas");
    expect(parseGroceryLogEntry("- 12 — bananas")).toEqual({
      week: 12,
      body: "bananas",
    });
  });

  test("normalizes week numbers", () => {
    expect(normalizeGroceryWeekNumber("W9")).toBe(9);
    expect(formatCurrentGroceryWeekNumber(new Date("2026-06-10T12:00:00.000Z"))).toMatch(/^\d{1,2}$/);
  });
});
