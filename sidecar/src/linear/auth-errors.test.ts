import { describe, expect, test } from "bun:test";
import {
  formatLinearQuotaErrorMessage,
  isLinearQuotaErrorMessage,
} from "./auth-errors.ts";

describe("formatLinearQuotaErrorMessage", () => {
  test("maps quota exceeded to a friendly rate limit message", () => {
    expect(formatLinearQuotaErrorMessage("quota exceeded")).toBe(
      "Linear rate limit reached. Wait a minute and try again.",
    );
  });

  test("detects quota errors", () => {
    expect(isLinearQuotaErrorMessage("Quota exceeded")).toBe(true);
    expect(isLinearQuotaErrorMessage("Title is required")).toBe(false);
  });
});
