import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readProfileContent, writeProfileContent } from "./profiles-api.ts";

describe("profiles-api", () => {
  let dataDir: string;
  let previousDataDir: string | undefined;

  beforeEach(() => {
    previousDataDir = process.env.BACKSTER_DATA_DIR;
    dataDir = mkdtempSync(join(tmpdir(), "backster-profiles-"));
    process.env.BACKSTER_DATA_DIR = dataDir;
  });

  afterEach(() => {
    if (previousDataDir === undefined) {
      delete process.env.BACKSTER_DATA_DIR;
    } else {
      process.env.BACKSTER_DATA_DIR = previousDataDir;
    }
    rmSync(dataDir, { recursive: true, force: true });
  });

  test("readProfileContent creates default user profile when missing", () => {
    const content = readProfileContent("user");
    expect(content).toContain("# User profile");
    expect(existsSync(join(dataDir, "profile.md"))).toBe(true);
  });

  test("writeProfileContent persists updates", () => {
    writeProfileContent("agent", "# Agent\n\n- Name: Backster\n");
    expect(readFileSync(join(dataDir, "agent.md"), "utf8")).toBe("# Agent\n\n- Name: Backster\n");
    expect(readProfileContent("agent")).toBe("# Agent\n\n- Name: Backster\n");
  });
});
