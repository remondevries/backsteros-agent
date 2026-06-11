import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  clearGoogleCalendarCredentials,
  getIntegrationsStatus,
  importGoogleCalendarCredentials,
  parseOAuthCredentialsJson,
  saveGoogleCalendarOAuthCredentials,
  secretPreview,
  updateIntegrationSecrets,
} from "./integrations-secrets.ts";

describe("integrations-secrets", () => {
  let dataDir: string;
  let previousDataDir: string | undefined;

  beforeEach(() => {
    previousDataDir = process.env.BACKSTER_DATA_DIR;
    dataDir = mkdtempSync(join(tmpdir(), "backster-integrations-"));
    process.env.BACKSTER_DATA_DIR = dataDir;
    delete process.env.CURSOR_API_KEY;
    delete process.env.LINEAR_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_OAUTH_CREDENTIALS;
  });

  afterEach(() => {
    if (previousDataDir === undefined) {
      delete process.env.BACKSTER_DATA_DIR;
    } else {
      process.env.BACKSTER_DATA_DIR = previousDataDir;
    }
    rmSync(dataDir, { recursive: true, force: true });
  });

  test("secretPreview masks values", () => {
    expect(secretPreview(undefined)).toBeUndefined();
    expect(secretPreview("abc")).toBe("...");
    expect(secretPreview("cursor_abcdefghij")).toBe("...ghij");
  });

  test("updateIntegrationSecrets writes keys and reloads env", () => {
    const status = updateIntegrationSecrets({
      cursorApiKey: "cursor_saved_key",
      linearApiKey: "lin_saved_key",
    });

    expect(status.cursorApiKey.configured).toBe(true);
    expect(status.cursorApiKey.preview).toBe("..._key");
    expect(status.linearApiKey.configured).toBe(true);
    expect(process.env.CURSOR_API_KEY).toBe("cursor_saved_key");
    expect(process.env.LINEAR_API_KEY).toBe("lin_saved_key");
  });

  test("updateIntegrationSecrets clears keys with empty string", () => {
    updateIntegrationSecrets({ cursorApiKey: "cursor_temp" });
    const status = updateIntegrationSecrets({ cursorApiKey: "" });
    expect(status.cursorApiKey.configured).toBe(false);
    expect(process.env.CURSOR_API_KEY).toBeUndefined();
  });

  test("parseOAuthCredentialsJson accepts installed format", () => {
    const parsed = parseOAuthCredentialsJson({
      installed: {
        client_id: "id",
        client_secret: "secret",
      },
    });
    expect(parsed.client_id).toBe("id");
    expect(parsed.client_secret).toBe("secret");
  });

  test("importGoogleCalendarCredentials writes file and env path", () => {
    const payload = {
      installed: {
        client_id: "id",
        client_secret: "secret",
      },
    };

    const status = importGoogleCalendarCredentials(payload);
    const credentialsPath = join(dataDir, "google-oauth.keys.json");

    expect(existsSync(credentialsPath)).toBe(true);
    expect(JSON.parse(readFileSync(credentialsPath, "utf8"))).toEqual(payload);
    expect(process.env.GOOGLE_OAUTH_CREDENTIALS).toBe(credentialsPath);
    expect(status.googleCalendar.credentialsConfigured).toBe(true);
    expect(status.googleCalendar.clientId.configured).toBe(true);
    expect(status.googleCalendar.clientSecret.configured).toBe(true);
    expect(getIntegrationsStatus().googleCalendar.credentialsConfigured).toBe(true);
  });

  test("saveGoogleCalendarOAuthCredentials writes desktop app JSON from fields", () => {
    const status = saveGoogleCalendarOAuthCredentials({
      clientId: "123.apps.googleusercontent.com",
      clientSecret: "GOCSPX-secret",
    });

    const credentialsPath = join(dataDir, "google-oauth.keys.json");
    const saved = JSON.parse(readFileSync(credentialsPath, "utf8")) as {
      installed: { client_id: string; client_secret: string };
    };

    expect(saved.installed.client_id).toBe("123.apps.googleusercontent.com");
    expect(saved.installed.client_secret).toBe("GOCSPX-secret");
    expect(status.googleCalendar.clientId.preview).toBe("....com");
    expect(status.googleCalendar.clientSecret.preview).toBe("...cret");
  });

  test("saveGoogleCalendarOAuthCredentials requires both fields", () => {
    expect(() =>
      saveGoogleCalendarOAuthCredentials({
        clientId: "123.apps.googleusercontent.com",
      }),
    ).toThrow("Client ID and client secret are both required");
  });

  test("clearGoogleCalendarCredentials removes saved credentials", () => {
    saveGoogleCalendarOAuthCredentials({
      clientId: "123.apps.googleusercontent.com",
      clientSecret: "GOCSPX-secret",
    });

    const status = clearGoogleCalendarCredentials();
    expect(status.googleCalendar.credentialsConfigured).toBe(false);
    expect(status.googleCalendar.clientId.configured).toBe(false);
    expect(process.env.GOOGLE_OAUTH_CREDENTIALS).toBeUndefined();
  });

  test("importGoogleCalendarCredentials rejects invalid JSON", () => {
    expect(() => parseOAuthCredentialsJson({ foo: "bar" })).toThrow(
      "Invalid Google OAuth credentials file format",
    );
  });
});
