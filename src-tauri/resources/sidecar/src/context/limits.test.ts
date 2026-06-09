import { describe, expect, test } from "bun:test";
import { truncateContextSection, MAX_CONTEXT_SECTION_CHARS } from "./limits.ts";

describe("truncateContextSection", () => {
  test("returns text unchanged when under limit", () => {
    expect(truncateContextSection("hello")).toBe("hello");
  });

  test("truncates long text with omission note", () => {
    const text = "x".repeat(MAX_CONTEXT_SECTION_CHARS + 50);
    const result = truncateContextSection(text);
    expect(result.length).toBeLessThan(text.length);
    expect(result).toContain("truncated");
    expect(result).toContain("50 chars omitted");
  });
});
