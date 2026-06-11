import { describe, expect, test } from "bun:test";
import {
  formatGroceryLogEntry,
  formatGroceryWeekTitle,
  getSaturdayOfISOWeek,
  normalizeGroceryWeekNumber,
  parseGroceryLogEntry,
  resolveGroceryWeekContext,
} from "./grocery-week.ts";

describe("grocery-week", () => {
  test("normalizes week numbers", () => {
    expect(normalizeGroceryWeekNumber("25")).toBe(25);
    expect(normalizeGroceryWeekNumber("w12")).toBe(12);
    expect(normalizeGroceryWeekNumber("week 8")).toBe(8);
    expect(normalizeGroceryWeekNumber("0")).toBeNull();
  });

  test("formats grocery log entries", () => {
    expect(formatGroceryLogEntry("milk, eggs", 25)).toBe("- 25 — milk, eggs");
    expect(parseGroceryLogEntry("- 25 — milk, eggs")).toEqual({
      week: 25,
      body: "milk, eggs",
    });
  });

  test("resolves week context with saturday due date", () => {
    const context = resolveGroceryWeekContext("25", new Date("2026-06-10T12:00:00.000Z"));
    expect(context.week).toBe(25);
    expect(context.dueDate).toBe(getSaturdayOfISOWeek(25, context.year));
    expect(formatGroceryWeekTitle(context.week)).toBe("Week 25");
  });
});
