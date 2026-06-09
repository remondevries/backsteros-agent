import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadUserIdentityContext } from "./profile.ts";

let dataDir = "";
let previousDataDir: string | undefined;

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), "backster-profile-"));
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

describe("loadUserIdentityContext", () => {
  test("returns null when profile is missing", () => {
    expect(loadUserIdentityContext()).toBeNull();
  });

  test("loads compact identity context from profile.md", () => {
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(
      join(dataDir, "profile.md"),
      `# User profile

- Name: Remon de Vries
- Timezone: Europe/Amsterdam
- City: Leeuwarden, Netherlands
- Role: Software engineer; runs Lemo-Design agency
`,
      "utf8",
    );

    const context = loadUserIdentityContext();
    expect(context).toContain("[User]");
    expect(context).toContain("Name: Remon de Vries");
    expect(context).toContain("Timezone: Europe/Amsterdam");
    expect(context).toContain("Leeuwarden");
    expect(context).toContain("Lemo-Design");
    expect(context).toContain('Interpret "today"');
  });
});
