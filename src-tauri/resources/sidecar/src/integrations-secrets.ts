import { chmodSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  getCursorApiKey,
  getDefaultGoogleOAuthCredentialsPath,
  getDefaultLinearOAuthCredentialsPath,
  getGeminiApiKey,
  getGoogleOAuthCredentialsPath,
  getLinearApiKey,
  getLinearOAuthCredentialsPath,
  getLinearOAuthTokenPath,
  isGoogleCalendarAuthenticated,
  isGoogleCalendarConfigured,
  isLinearOAuthAuthenticated,
  isLinearOAuthConfigured,
} from "./config.ts";
import { getEnvFilePath, mergeEnvFile, reloadEnvFromDisk } from "./env-file.ts";

export interface SecretFieldStatus {
  configured: boolean;
  preview?: string;
}

export interface GoogleCalendarCredentialsStatus {
  credentialsConfigured: boolean;
  authenticated: boolean;
  clientId: SecretFieldStatus;
  clientSecret: SecretFieldStatus;
}

export interface LinearOAuthStatus {
  credentialsConfigured: boolean;
  authenticated: boolean;
  clientId: SecretFieldStatus;
  clientSecret: SecretFieldStatus;
}

export interface IntegrationsStatus {
  cursorApiKey: SecretFieldStatus;
  linearApiKey: SecretFieldStatus;
  geminiApiKey: SecretFieldStatus;
  googleCalendar: GoogleCalendarCredentialsStatus;
  linear: LinearOAuthStatus;
}

export function secretPreview(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed.length <= 4) return "...";
  return `...${trimmed.slice(-4)}`;
}

function readGoogleCalendarCredentialFields(): Pick<
  GoogleCalendarCredentialsStatus,
  "clientId" | "clientSecret"
> {
  const empty = {
    clientId: { configured: false },
    clientSecret: { configured: false },
  };

  const credentialsPath = getGoogleOAuthCredentialsPath();
  if (!credentialsPath || !existsSync(credentialsPath)) {
    return empty;
  }

  try {
    const parsed = parseOAuthCredentialsJson(JSON.parse(readFileSync(credentialsPath, "utf8")));
    return {
      clientId: {
        configured: true,
        preview: secretPreview(parsed.client_id),
      },
      clientSecret: {
        configured: true,
        preview: secretPreview(parsed.client_secret),
      },
    };
  } catch {
    return empty;
  }
}

function readLinearOAuthCredentialFields(): Pick<LinearOAuthStatus, "clientId" | "clientSecret"> {
  const empty = {
    clientId: { configured: false },
    clientSecret: { configured: false },
  };

  const credentialsPath = getLinearOAuthCredentialsPath();
  if (!credentialsPath || !existsSync(credentialsPath)) {
    return empty;
  }

  try {
    const parsed = parseLinearOAuthCredentialsJson(JSON.parse(readFileSync(credentialsPath, "utf8")));
    return {
      clientId: {
        configured: true,
        preview: secretPreview(parsed.client_id),
      },
      clientSecret: {
        configured: true,
        preview: secretPreview(parsed.client_secret),
      },
    };
  } catch {
    return empty;
  }
}

export function getIntegrationsStatus(): IntegrationsStatus {
  const cursor = getCursorApiKey()?.trim();
  const linear = getLinearApiKey();
  const gemini = getGeminiApiKey();
  const googleCalendarCredentials = readGoogleCalendarCredentialFields();
  const linearOAuthCredentials = readLinearOAuthCredentialFields();

  return {
    cursorApiKey: {
      configured: Boolean(cursor),
      preview: secretPreview(cursor),
    },
    linearApiKey: {
      configured: Boolean(linear),
      preview: secretPreview(linear),
    },
    geminiApiKey: {
      configured: Boolean(gemini),
      preview: secretPreview(gemini),
    },
    googleCalendar: {
      credentialsConfigured: isGoogleCalendarConfigured(),
      authenticated: isGoogleCalendarAuthenticated(),
      ...googleCalendarCredentials,
    },
    linear: {
      credentialsConfigured: isLinearOAuthConfigured(),
      authenticated: isLinearOAuthAuthenticated(),
      ...linearOAuthCredentials,
    },
  };
}

export function updateIntegrationSecrets(body: {
  cursorApiKey?: string | null;
  linearApiKey?: string | null;
  geminiApiKey?: string | null;
}): IntegrationsStatus {
  const updates: Record<string, string | null> = {};

  if (body.cursorApiKey !== undefined) {
    updates.CURSOR_API_KEY = body.cursorApiKey?.trim() || null;
  }
  if (body.linearApiKey !== undefined) {
    updates.LINEAR_API_KEY = body.linearApiKey?.trim() || null;
  }
  if (body.geminiApiKey !== undefined) {
    updates.GEMINI_API_KEY = body.geminiApiKey?.trim() || null;
  }

  if (Object.keys(updates).length > 0) {
    mergeEnvFile(getEnvFilePath(), updates);
    reloadEnvFromDisk();
  }

  return getIntegrationsStatus();
}

export function parseOAuthCredentialsJson(raw: unknown): { client_id: string; client_secret: string } {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid Google OAuth credentials JSON");
  }

  const keys = raw as Record<string, unknown>;
  const installed =
    keys.installed && typeof keys.installed === "object"
      ? (keys.installed as Record<string, unknown>)
      : null;

  if (installed?.client_id && installed.client_secret) {
    return {
      client_id: String(installed.client_id),
      client_secret: String(installed.client_secret),
    };
  }

  if (keys.client_id && keys.client_secret) {
    return {
      client_id: String(keys.client_id),
      client_secret: String(keys.client_secret),
    };
  }

  throw new Error("Invalid Google OAuth credentials file format");
}

function writeGoogleCalendarCredentialsFile(raw: unknown): IntegrationsStatus {
  parseOAuthCredentialsJson(raw);

  const credentialsPath = getDefaultGoogleOAuthCredentialsPath();
  mkdirSync(dirname(credentialsPath), { recursive: true });
  writeFileSync(credentialsPath, `${JSON.stringify(raw, null, 2)}\n`, { mode: 0o600 });
  try {
    chmodSync(credentialsPath, 0o600);
  } catch {
    // Best effort on platforms that restrict chmod.
  }

  mergeEnvFile(getEnvFilePath(), {
    GOOGLE_OAUTH_CREDENTIALS: credentialsPath,
  });
  reloadEnvFromDisk();

  return getIntegrationsStatus();
}

export function importGoogleCalendarCredentials(raw: unknown): IntegrationsStatus {
  return writeGoogleCalendarCredentialsFile(raw);
}

export function saveGoogleCalendarOAuthCredentials(body: {
  clientId?: string | null;
  clientSecret?: string | null;
  clear?: boolean;
}): IntegrationsStatus {
  if (body.clear) {
    return clearGoogleCalendarCredentials();
  }

  const clientId = body.clientId?.trim() ?? "";
  const clientSecret = body.clientSecret?.trim() ?? "";

  if (!clientId && !clientSecret) {
    return clearGoogleCalendarCredentials();
  }

  if (!clientId || !clientSecret) {
    throw new Error("Client ID and client secret are both required");
  }

  return writeGoogleCalendarCredentialsFile({
    installed: {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uris: ["http://localhost"],
    },
  });
}

export function clearGoogleCalendarCredentials(): IntegrationsStatus {
  const credentialsPath = getGoogleOAuthCredentialsPath() || getDefaultGoogleOAuthCredentialsPath();

  if (credentialsPath && existsSync(credentialsPath)) {
    unlinkSync(credentialsPath);
  }

  mergeEnvFile(getEnvFilePath(), {
    GOOGLE_OAUTH_CREDENTIALS: null,
  });
  reloadEnvFromDisk();

  return getIntegrationsStatus();
}

export function parseLinearOAuthCredentialsJson(raw: unknown): {
  client_id: string;
  client_secret: string;
} {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid Linear OAuth credentials JSON");
  }

  const keys = raw as Record<string, unknown>;
  if (keys.client_id && keys.client_secret) {
    return {
      client_id: String(keys.client_id),
      client_secret: String(keys.client_secret),
    };
  }

  throw new Error("Invalid Linear OAuth credentials file format");
}

function writeLinearOAuthCredentialsFile(raw: unknown): IntegrationsStatus {
  parseLinearOAuthCredentialsJson(raw);

  const credentialsPath = getDefaultLinearOAuthCredentialsPath();
  mkdirSync(dirname(credentialsPath), { recursive: true });
  writeFileSync(credentialsPath, `${JSON.stringify(raw, null, 2)}\n`, { mode: 0o600 });
  try {
    chmodSync(credentialsPath, 0o600);
  } catch {
    // Best effort on platforms that restrict chmod.
  }

  mergeEnvFile(getEnvFilePath(), {
    LINEAR_OAUTH_CREDENTIALS: credentialsPath,
  });
  reloadEnvFromDisk();
  process.env.LINEAR_OAUTH_CREDENTIALS = credentialsPath;

  return getIntegrationsStatus();
}

export function saveLinearOAuthCredentials(body: {
  clientId?: string | null;
  clientSecret?: string | null;
  clear?: boolean;
}): IntegrationsStatus {
  if (body.clear) {
    return clearLinearOAuthCredentials();
  }

  const clientId = body.clientId?.trim() ?? "";
  const clientSecret = body.clientSecret?.trim() ?? "";

  if (!clientId && !clientSecret) {
    return clearLinearOAuthCredentials();
  }

  if (!clientId || !clientSecret) {
    throw new Error("Client ID and client secret are both required");
  }

  return writeLinearOAuthCredentialsFile({
    client_id: clientId,
    client_secret: clientSecret,
  });
}

export function clearLinearOAuthCredentials(): IntegrationsStatus {
  const credentialsPath = getLinearOAuthCredentialsPath() || getDefaultLinearOAuthCredentialsPath();
  const tokenPath = getLinearOAuthTokenPath();

  if (credentialsPath && existsSync(credentialsPath)) {
    unlinkSync(credentialsPath);
  }

  if (existsSync(tokenPath)) {
    unlinkSync(tokenPath);
  }

  mergeEnvFile(getEnvFilePath(), {
    LINEAR_OAUTH_CREDENTIALS: null,
  });
  reloadEnvFromDisk();
  delete process.env.LINEAR_OAUTH_CREDENTIALS;

  return getIntegrationsStatus();
}
