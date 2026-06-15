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
  isServerAccessAuthEnabled,
  isUserCursorApiKeyConfigured,
} from "./config.ts";
import { mergeEnvFile } from "./env-file.ts";

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

describe("isServerAccessAuthEnabled", () => {
  let previousValue: string | undefined;

  beforeEach(() => {
    previousValue = process.env.BACKSTER_SERVER_ACCESS_AUTH;
  });

  afterEach(() => {
    if (previousValue === undefined) delete process.env.BACKSTER_SERVER_ACCESS_AUTH;
    else process.env.BACKSTER_SERVER_ACCESS_AUTH = previousValue;
  });

  test("defaults to enabled", () => {
    delete process.env.BACKSTER_SERVER_ACCESS_AUTH;
    expect(isServerAccessAuthEnabled()).toBe(true);
  });

  test("can be disabled for public staging web", () => {
    process.env.BACKSTER_SERVER_ACCESS_AUTH = "0";
    expect(isServerAccessAuthEnabled()).toBe(false);
  });
});

describe("isUserCursorApiKeyConfigured", () => {
  let dataDir: string;
  let previousDataDir: string | undefined;
  let previousCursorKey: string | undefined;

  beforeEach(() => {
    previousDataDir = process.env.BACKSTER_DATA_DIR;
    previousCursorKey = process.env.CURSOR_API_KEY;
    dataDir = mkdtempSync(join(tmpdir(), "backster-cursor-key-"));
    process.env.BACKSTER_DATA_DIR = dataDir;
    delete process.env.CURSOR_API_KEY;
  });

  afterEach(() => {
    if (previousDataDir === undefined) delete process.env.BACKSTER_DATA_DIR;
    else process.env.BACKSTER_DATA_DIR = previousDataDir;
    if (previousCursorKey === undefined) delete process.env.CURSOR_API_KEY;
    else process.env.CURSOR_API_KEY = previousCursorKey;
    rmSync(dataDir, { recursive: true, force: true });
  });

  test("returns false when only container env is set", () => {
    process.env.CURSOR_API_KEY = "cursor_from_kamal";
    expect(isUserCursorApiKeyConfigured()).toBe(false);
  });

  test("returns true when key is saved under the data dir", () => {
    mergeEnvFile(join(dataDir, ".env"), { CURSOR_API_KEY: "cursor_user_saved" });
    expect(isUserCursorApiKeyConfigured()).toBe(true);
  });
});

describe("Linear OAuth credentials path", () => {
  let dataDir: string;
  let previousDataDir: string | undefined;
  let previousCredentialsPath: string | undefined;
  let previousClientId: string | undefined;
  let previousClientSecret: string | undefined;

  beforeEach(() => {
    previousDataDir = process.env.BACKSTER_DATA_DIR;
    previousCredentialsPath = process.env.LINEAR_OAUTH_CREDENTIALS;
    previousClientId = process.env.LINEAR_OAUTH_CLIENT_ID;
    previousClientSecret = process.env.LINEAR_OAUTH_CLIENT_SECRET;
    dataDir = mkdtempSync(join(tmpdir(), "backster-linear-oauth-"));
    process.env.BACKSTER_DATA_DIR = dataDir;
    delete process.env.LINEAR_OAUTH_CREDENTIALS;
    delete process.env.LINEAR_OAUTH_CLIENT_ID;
    delete process.env.LINEAR_OAUTH_CLIENT_SECRET;
  });

  afterEach(() => {
    if (previousDataDir === undefined) delete process.env.BACKSTER_DATA_DIR;
    else process.env.BACKSTER_DATA_DIR = previousDataDir;
    if (previousCredentialsPath === undefined) delete process.env.LINEAR_OAUTH_CREDENTIALS;
    else process.env.LINEAR_OAUTH_CREDENTIALS = previousCredentialsPath;
    if (previousClientId === undefined) delete process.env.LINEAR_OAUTH_CLIENT_ID;
    else process.env.LINEAR_OAUTH_CLIENT_ID = previousClientId;
    if (previousClientSecret === undefined) delete process.env.LINEAR_OAUTH_CLIENT_SECRET;
    else process.env.LINEAR_OAUTH_CLIENT_SECRET = previousClientSecret;
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

  test("reads credentials from env when client ID and secret are set", () => {
    process.env.LINEAR_OAUTH_CLIENT_ID = "env-client-id";
    process.env.LINEAR_OAUTH_CLIENT_SECRET = "env-client-secret";

    expect(isLinearOAuthConfigured()).toBe(true);
  });
});
