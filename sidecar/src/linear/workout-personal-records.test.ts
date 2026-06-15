import { describe, expect, test } from "bun:test";
import {
  formatWorkoutPersonalRecordTitle,
  parseWorkoutRepWeightKg,
  shouldReplacePersonalRecordTitle,
} from "./workout-personal-records.ts";
import { WORKOUT_REP_WEIGHT_PLACEHOLDER } from "./workout-sessions.ts";

describe("parseWorkoutRepWeightKg", () => {
  test("parses numeric rep titles", () => {
    expect(parseWorkoutRepWeightKg("80")).toBe(80);
    expect(parseWorkoutRepWeightKg("82.5")).toBe(82.5);
  });

  test("ignores placeholders and set labels", () => {
    expect(parseWorkoutRepWeightKg(WORKOUT_REP_WEIGHT_PLACEHOLDER)).toBeNull();
    expect(parseWorkoutRepWeightKg("Set 1")).toBeNull();
    expect(parseWorkoutRepWeightKg("")).toBeNull();
  });
});

describe("shouldReplacePersonalRecordTitle", () => {
  test("replaces when the new weight is higher", () => {
    expect(shouldReplacePersonalRecordTitle("80", 85)).toBe(true);
    expect(shouldReplacePersonalRecordTitle("80.5", 80.6)).toBe(true);
  });

  test("keeps the existing record when the new weight is lower or equal", () => {
    expect(shouldReplacePersonalRecordTitle("80", 75)).toBe(false);
    expect(shouldReplacePersonalRecordTitle("80", 80)).toBe(false);
  });

  test("replaces invalid existing titles", () => {
    expect(shouldReplacePersonalRecordTitle("unknown", 50)).toBe(true);
  });
});

describe("formatWorkoutPersonalRecordTitle", () => {
  test("formats whole and decimal weights", () => {
    expect(formatWorkoutPersonalRecordTitle(80)).toBe("80");
    expect(formatWorkoutPersonalRecordTitle(82.5)).toBe("82.5");
  });
});
