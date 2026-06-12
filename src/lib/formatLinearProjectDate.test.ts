import { describe, expect, test } from "bun:test";
import {
  formatLinearProjectDate,
  formatLinearProjectProgress,
} from "./formatLinearProjectDate";

describe("formatLinearProjectDate", () => {
  test("formats dates with ordinal suffix", () => {
    expect(formatLinearProjectDate("2024-12-08")).toBe("Dec 8th, 2024");
    expect(formatLinearProjectDate("2024-12-01")).toBe("Dec 1st, 2024");
    expect(formatLinearProjectDate("2024-12-02")).toBe("Dec 2nd, 2024");
    expect(formatLinearProjectDate("2024-12-03")).toBe("Dec 3rd, 2024");
  });

  test("returns null for empty values", () => {
    expect(formatLinearProjectDate(null)).toBeNull();
    expect(formatLinearProjectDate("")).toBeNull();
  });
});

describe("formatLinearProjectProgress", () => {
  test("formats fractional progress as percent", () => {
    expect(formatLinearProjectProgress(0.813)).toBe("81%");
    expect(formatLinearProjectProgress(1)).toBe("100%");
    expect(formatLinearProjectProgress(0)).toBe("0%");
  });

  test("returns null for missing values", () => {
    expect(formatLinearProjectProgress(null)).toBeNull();
    expect(formatLinearProjectProgress(undefined)).toBeNull();
  });
});
