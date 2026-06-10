import { describe, expect, test } from "bun:test";
import { formatGeminiApiError } from "./lookup-gemini-errors.ts";

describe("formatGeminiApiError", () => {
  test("formats quota errors clearly", () => {
    const message = formatGeminiApiError(
      JSON.stringify({
        error: {
          code: 429,
          message: "You exceeded your current quota, please check your plan and billing details.",
        },
      }),
      429,
    );

    expect(message).toContain("quota limit reached");
    expect(message).toContain("Docs mode");
  });
});
