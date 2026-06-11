import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mergeEnvFile, readEnvFile, reloadEnvFromDisk } from "./env-file.ts";

describe("env-file", () => {
  let dataDir: string;
  let envPath: string;
  let previousDataDir: string | undefined;

  beforeEach(() => {
    previousDataDir = process.env.BACKSTER_DATA_DIR;
    dataDir = mkdtempSync(join(tmpdir(), "backster-env-file-"));
    envPath = join(dataDir, ".env");
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

  test("readEnvFile ignores comments and blank lines", () => {
    mergeEnvFile(envPath, { CURSOR_API_KEY: "cursor_test", LINEAR_API_KEY: "lin_test" });
    const content = readFileSync(envPath, "utf8");
    expect(content).toContain("CURSOR_API_KEY=cursor_test");

    mergeEnvFile(envPath, { GEMINI_API_KEY: "gem_test" });
    const parsed = readEnvFile(envPath);
    expect(parsed.CURSOR_API_KEY).toBe("cursor_test");
    expect(parsed.GEMINI_API_KEY).toBe("gem_test");
  });

  test("mergeEnvFile updates existing keys and removes cleared keys", () => {
    mergeEnvFile(envPath, {
      CURSOR_API_KEY: "cursor_old",
      LINEAR_API_KEY: "lin_old",
    });
    mergeEnvFile(envPath, {
      CURSOR_API_KEY: "cursor_new",
      LINEAR_API_KEY: null,
    });

    const parsed = readEnvFile(envPath);
    expect(parsed.CURSOR_API_KEY).toBe("cursor_new");
    expect(parsed.LINEAR_API_KEY).toBeUndefined();
  });

  test("reloadEnvFromDisk overwrites process.env from file", () => {
    mergeEnvFile(envPath, { CURSOR_API_KEY: "cursor_from_disk" });
    process.env.CURSOR_API_KEY = "cursor_in_memory";

    reloadEnvFromDisk();

    expect(process.env.CURSOR_API_KEY).toBe("cursor_from_disk");
  });

  test("mergeEnvFile creates parent directory", () => {
    const nestedPath = join(dataDir, "nested", ".env");
    expect(existsSync(join(dataDir, "nested"))).toBe(false);
    mergeEnvFile(nestedPath, { CURSOR_API_KEY: "cursor_nested" });
    expect(readEnvFile(nestedPath).CURSOR_API_KEY).toBe("cursor_nested");
  });
});
