import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fetchLinearProjectsPage } from "./projects.ts";

describe("linear projects", () => {
  let dataDir: string;
  let previousDataDir: string | undefined;

  beforeEach(() => {
    previousDataDir = process.env.BACKSTER_DATA_DIR;
    dataDir = mkdtempSync(join(tmpdir(), "backster-linear-projects-"));
    process.env.BACKSTER_DATA_DIR = dataDir;
    delete process.env.LINEAR_API_KEY;
    delete process.env.LINEAR_OAUTH_CLIENT_ID;
    delete process.env.LINEAR_OAUTH_CLIENT_SECRET;
    delete process.env.LINEAR_OAUTH_CREDENTIALS;
  });

  afterEach(() => {
    if (previousDataDir === undefined) {
      delete process.env.BACKSTER_DATA_DIR;
    } else {
      process.env.BACKSTER_DATA_DIR = previousDataDir;
    }
    rmSync(dataDir, { recursive: true, force: true });
  });

  test("fetchLinearProjectsPage requires Linear OAuth", async () => {
    await expect(fetchLinearProjectsPage()).rejects.toThrow(
      "Linear is not connected. Connect OAuth in Settings.",
    );
  });
});
