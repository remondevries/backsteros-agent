import { describe, expect, test } from "bun:test";
import { getCalendarStartupWarning } from "./integrationWarnings";

describe("getCalendarStartupWarning", () => {
  test("returns no warning when calendar is not configured", () => {
    expect(
      getCalendarStartupWarning({
        hasGoogleCalendarCredentials: false,
        hasGoogleCalendarAuth: false,
      }),
    ).toEqual({ message: null, needsConnect: false });
  });

  test("returns connect warning when credentials exist but account is not linked", () => {
    const result = getCalendarStartupWarning({
      hasGoogleCalendarCredentials: true,
      hasGoogleCalendarAuth: false,
    });
    expect(result.needsConnect).toBe(true);
    expect(result.message).toContain("not linked yet");
  });

  test("returns no warning when calendar is fully connected", () => {
    expect(
      getCalendarStartupWarning({
        hasGoogleCalendarCredentials: true,
        hasGoogleCalendarAuth: true,
      }),
    ).toEqual({ message: null, needsConnect: false });
  });
});
