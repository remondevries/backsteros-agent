import { describe, expect, test } from "bun:test";
import {
  formatLinearAuthErrorMessage,
  isLinearAuthErrorMessage,
} from "./auth-errors.ts";

describe("linear auth errors", () => {
  test("detects Linear auth failures", () => {
    expect(isLinearAuthErrorMessage("Authentication required, not authenticated")).toBe(true);
    expect(isLinearAuthErrorMessage("Unauthorized")).toBe(true);
    expect(isLinearAuthErrorMessage("project not in same team as issue")).toBe(false);
  });

  test("formats auth failures for users", () => {
    expect(formatLinearAuthErrorMessage("Authentication required, not authenticated")).toContain(
      "Linear session expired",
    );
  });
});
