import { describe, expect, test } from "bun:test";
import { integrationReadinessHints } from "./integrations.ts";

describe("integrationReadinessHints", () => {
  test("returns no hints when services are inactive", () => {
    expect(
      integrationReadinessHints({
        obsidian: false,
        linear: false,
        calendar: false,
        whoop: false,
      }),
    ).toEqual([]);
  });

  test("includes calendar setup hint when calendar is active but not configured", () => {
    const previousCredentials = process.env.GOOGLE_OAUTH_CREDENTIALS;
    process.env.GOOGLE_OAUTH_CREDENTIALS = "/tmp/backster-missing-google-oauth.json";

    try {
      const hints = integrationReadinessHints({
        obsidian: false,
        linear: false,
        calendar: true,
        whoop: false,
      });
      expect(hints.some((hint) => hint.includes("[Calendar setup]"))).toBe(true);
    } finally {
      if (previousCredentials === undefined) {
        delete process.env.GOOGLE_OAUTH_CREDENTIALS;
      } else {
        process.env.GOOGLE_OAUTH_CREDENTIALS = previousCredentials;
      }
    }
  });
});
