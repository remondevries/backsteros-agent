import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  runAllIntegrationTests,
  testCursorIntegration,
  testGeminiIntegration,
  testGoogleCalendarCredentials,
  testGoogleCalendarIntegration,
  testLinearIntegration,
} from "./integrations-test.ts";

describe("integrations-test", () => {
  let previousEnv: Record<string, string | undefined>;

  beforeEach(() => {
    previousEnv = {
      CURSOR_API_KEY: process.env.CURSOR_API_KEY,
      LINEAR_API_KEY: process.env.LINEAR_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      GOOGLE_OAUTH_CREDENTIALS: process.env.GOOGLE_OAUTH_CREDENTIALS,
    };
    delete process.env.CURSOR_API_KEY;
    delete process.env.LINEAR_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_OAUTH_CREDENTIALS;
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  test("testCursorIntegration reports not configured without key", async () => {
    const result = await testCursorIntegration();
    expect(result.ok).toBe(false);
    expect(result.message).toContain("not configured");
  });

  test("testCursorIntegration uses draft key override", async () => {
    const result = await testCursorIntegration("draft-cursor-key");
    expect(result.ok).toBe(false);
    expect(result.message).not.toContain("not configured");
  });

  test("testLinearIntegration uses draft key override", async () => {
    const result = await testLinearIntegration("draft-linear-key");
    expect(result.ok).toBe(false);
    expect(result.message).not.toContain("not configured");
  });

  test("testLinearIntegration reports not configured without key", async () => {
    const result = await testLinearIntegration();
    expect(result.ok).toBe(false);
    expect(result.message).toContain("not configured");
  });

  test("testGeminiIntegration reports not configured without key", async () => {
    const result = await testGeminiIntegration();
    expect(result.ok).toBe(false);
    expect(result.message).toContain("not configured");
  });

  test("testGoogleCalendarIntegration reports not configured without credentials", async () => {
    const result = await testGoogleCalendarIntegration();
    expect(result.ok).toBe(false);
    expect(result.message).toContain("not configured");
  });

  test("testGoogleCalendarCredentials validates draft credentials", async () => {
    const result = await testGoogleCalendarCredentials({
      googleOAuthClientId: "123.apps.googleusercontent.com",
      googleOAuthClientSecret: "GOCSPX-secret",
    });
    expect(result.ok).toBe(true);
  });

  test("testGoogleCalendarCredentials rejects partial draft credentials", async () => {
    const result = await testGoogleCalendarCredentials({
      googleOAuthClientId: "123.apps.googleusercontent.com",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("both");
  });

  test("runAllIntegrationTests returns all services", async () => {
    const report = await runAllIntegrationTests();
    expect(Object.keys(report).sort()).toEqual(
      ["cursor", "gemini", "googleCalendar", "linear"].sort(),
    );
    expect(report.cursor.ok).toBe(false);
    expect(report.linear.ok).toBe(false);
    expect(report.gemini.ok).toBe(false);
    expect(report.googleCalendar.ok).toBe(false);
  });
});
