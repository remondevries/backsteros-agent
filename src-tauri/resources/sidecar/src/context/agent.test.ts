import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadAgentIdentityContext } from "./agent.ts";

let dataDir = "";
let previousDataDir: string | undefined;

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), "backster-agent-profile-"));
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

describe("loadAgentIdentityContext", () => {
  test("returns null when agent profile is missing", () => {
    expect(loadAgentIdentityContext()).toBeNull();
  });

  test("loads compact agent context from agent.md", () => {
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(
      join(dataDir, "agent.md"),
      `# Agent

- Name: Backster
- Role: Personal assistant
- Purpose: Help organize notes
`,
      "utf8",
    );

    const context = loadAgentIdentityContext();
    expect(context).toContain("[Agent]");
    expect(context).toContain("Name: Backster");
    expect(context).toContain("Purpose: Help organize notes");
  });
});
