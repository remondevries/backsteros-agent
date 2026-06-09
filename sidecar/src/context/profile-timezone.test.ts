import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  isValidTimezone,
  loadUserTimezone,
  parseTimezoneFromProfileContent,
} from "./profile.ts";

let dataDir = "";
let previousDataDir: string | undefined;

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), "backster-profile-tz-"));
  previousDataDir = process.env.BACKSTER_DATA_DIR;
  process.env.BACKSTER_DATA_DIR = dataDir;
});

afterAll(() => {
  if (previousDataDir === undefined) {
    delete process.env.BACKSTER_DATA_DIR;
  } else {
    process.env.BACKSTER_DATA_DIR = previousDataDir;
  }
  rmSync(dataDir, { recursive: true, force: true });
});

describe("timezone helpers", () => {
  test("parseTimezoneFromProfileContent reads timezone line", () => {
    expect(
      parseTimezoneFromProfileContent("- Timezone: Europe/Amsterdam\n- Name: Remon"),
    ).toBe("Europe/Amsterdam");
  });

  test("loadUserTimezone falls back to UTC for invalid timezone", () => {
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(
      join(dataDir, "profile.md"),
      `- Timezone: Not/A/Timezone\n`,
      "utf8",
    );
    expect(loadUserTimezone()).toBe("UTC");
  });

  test("isValidTimezone accepts IANA zones", () => {
    expect(isValidTimezone("Europe/Amsterdam")).toBe(true);
    expect(isValidTimezone("Invalid/Zone")).toBe(false);
  });
});
