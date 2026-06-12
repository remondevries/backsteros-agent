import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  DEFAULT_SIDECAR_TOKEN,
  getDefaultLinearOAuthCredentialsPath,
  getLinearOAuthCredentialsPath,
  getSidecarToken,
  isLinearOAuthConfigured,
} from "./config.ts";

describe("getSidecarToken", () => {
  let previousToken: string | undefined;

  beforeEach(() => {
    previousToken = process.env.SIDECAR_TOKEN;
  });

  afterEach(() => {
    if (previousToken === undefined) delete process.env.SIDECAR_TOKEN;
    else process.env.SIDECAR_TOKEN = previousToken;
  });

  test("defaults to dev token when SIDECAR_TOKEN is unset", () => {
    delete process.env.SIDECAR_TOKEN;
    expect(getSidecarToken()).toBe(DEFAULT_SIDECAR_TOKEN);
  });

  test("reads SIDECAR_TOKEN from env when set", () => {
    process.env.SIDECAR_TOKEN = "custom-token";
    expect(getSidecarToken()).toBe("custom-token");
  });
});

describe("Linear OAuth credentials path", () => {
  let dataDir: string;
  let previousDataDir: string | undefined;
  let previousCredentialsPath: string | undefined;

  beforeEach(() => {
    previousDataDir = process.env.BACKSTER_DATA_DIR;
    previousCredentialsPath = process.env.LINEAR_OAUTH_CREDENTIALS;
    dataDir = mkdtempSync(join(tmpdir(), "backster-linear-oauth-"));
    process.env.BACKSTER_DATA_DIR = dataDir;
    delete process.env.LINEAR_OAUTH_CREDENTIALS;
  });

  afterEach(() => {
    if (previousDataDir === undefined) delete process.env.BACKSTER_DATA_DIR;
    else process.env.BACKSTER_DATA_DIR = previousDataDir;
    if (previousCredentialsPath === undefined) delete process.env.LINEAR_OAUTH_CREDENTIALS;
    else process.env.LINEAR_OAUTH_CREDENTIALS = previousCredentialsPath;
    rmSync(dataDir, { recursive: true, force: true });
  });

  test("falls back to default credentials file when env path is unset", () => {
    const defaultPath = getDefaultLinearOAuthCredentialsPath();
    writeFileSync(defaultPath, '{"client_id":"abc","client_secret":"secret1234"}\n');

    expect(getLinearOAuthCredentialsPath()).toBe(defaultPath);
    expect(isLinearOAuthConfigured()).toBe(true);
  });

  test("prefers configured env path when file exists", () => {
    const customPath = join(dataDir, "custom-linear-oauth.keys.json");
    writeFileSync(customPath, '{"client_id":"abc","client_secret":"secret1234"}\n');
    process.env.LINEAR_OAUTH_CREDENTIALS = customPath;

    expect(getLinearOAuthCredentialsPath()).toBe(customPath);
    expect(isLinearOAuthConfigured()).toBe(true);
  });
});
