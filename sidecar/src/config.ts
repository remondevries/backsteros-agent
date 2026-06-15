import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, mkdirSync, readFileSync } from "node:fs";

/** Matches Tauri default and Vite `VITE_SIDECAR_TOKEN` fallback for local dev. */
export const DEFAULT_SIDECAR_TOKEN = "dev-token-change-me";
import { reloadEnvFromDisk, readEnvFile, getEnvFilePath } from "./env-file.ts";

reloadEnvFromDisk();

const defaultPath = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
  join(homedir(), ".bun/bin"),
].join(":");

if (!process.env.PATH?.includes("/usr/bin")) {
  process.env.PATH = `${defaultPath}:${process.env.PATH ?? ""}`;
}

export function getDataDir(): string {
  return process.env.BACKSTER_DATA_DIR ?? join(homedir(), ".backsteros-agent");
}

export function getUserProfilePath(): string {
  return join(getDataDir(), "profile.md");
}

export function getAgentProfilePath(): string {
  return join(getDataDir(), "agent.md");
}

export function getSidecarToken(): string {
  const value = process.env.SIDECAR_TOKEN?.trim();
  return value || DEFAULT_SIDECAR_TOKEN;
}

export function getSidecarPort(): number {
  return Number(process.env.SIDECAR_PORT ?? 3847);
}

export function getSidecarHost(): string {
  const value = process.env.SIDECAR_HOST?.trim();
  if (value) return value;
  return isDevelopmentAuthMode() ? "127.0.0.1" : "0.0.0.0";
}

export type ProductMode = "linear" | "full";

export function getProductMode(): ProductMode {
  const mode = process.env.PRODUCT_MODE?.trim().toLowerCase();
  if (mode === "full") return "full";
  return "linear";
}

export function isVaultEnabled(): boolean {
  return getProductMode() === "full";
}

export function isDevelopmentAuthMode(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.BACKSTER_DEV_AUTH === "1" ||
    process.env.SIDECAR_DEV_AUTH === "1"
  );
}

export function getWorkspaceDir(): string {
  const configured = process.env.BACKSTER_WORKSPACE_DIR?.trim();
  if (configured) return configured;
  return join(getDataDir(), "workspace");
}

export function ensureWorkspaceDir(): string {
  const dir = getWorkspaceDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (!raw) {
    return isDevelopmentAuthMode()
      ? [
          "http://localhost:5173",
          "http://127.0.0.1:5173",
          "http://tauri.localhost",
          "https://tauri.localhost",
        ]
      : [];
  }
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const BUILTIN_APP_RETURN_ORIGINS = [
  "http://tauri.localhost",
  "https://tauri.localhost",
] as const;

export function getDefaultAppReturnUrl(): string {
  const origins = getAllowedOrigins();
  if (origins.length > 0) {
    return origins[0];
  }
  return "http://localhost:5173";
}

/**
 * Public HTTPS origin for Linear OAuth callback (web/staging). When set, OAuth uses
 * `{base}/linear/oauth/callback` on the sidecar instead of localhost:3510–3515.
 */
export function getLinearOAuthPublicBaseUrl(): string | undefined {
  const explicit = process.env.LINEAR_OAUTH_PUBLIC_BASE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }
  if (isDevelopmentAuthMode()) {
    return undefined;
  }
  const httpsOrigin = getAllowedOrigins().find((origin) => origin.startsWith("https://"));
  return httpsOrigin?.replace(/\/+$/, "");
}

/** Resolve a safe in-app URL for OAuth success pages (open redirect protection). */
export function resolveAppReturnUrl(input?: string): string {
  const fallback = getDefaultAppReturnUrl();
  const trimmed = input?.trim();
  if (!trimmed) return fallback;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return fallback;
    }

    const allowedOrigins = new Set([
      ...getAllowedOrigins(),
      ...BUILTIN_APP_RETURN_ORIGINS,
    ]);
    if (!allowedOrigins.has(url.origin)) {
      return fallback;
    }

    return url.href;
  } catch {
    return fallback;
  }
}

export function appendAppReturnQuery(
  baseUrl: string,
  query: Record<string, string>,
): string {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return url.href;
}

export function getCursorApiKey(): string | undefined {
  const value = process.env.CURSOR_API_KEY?.trim();
  return value || undefined;
}

/** True when the user saved a Cursor API key under the data dir (not Kamal/container env alone). */
export function isUserCursorApiKeyConfigured(): boolean {
  const value = readEnvFile(getEnvFilePath()).CURSOR_API_KEY?.trim();
  return Boolean(value);
}

export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || undefined;
}

export const GEMINI_LOOKUP_MODEL = process.env.GEMINI_LOOKUP_MODEL?.trim() || "gemini-2.5-flash";

export function getNotesDirOverride(): string | undefined {
  const value = process.env.NOTES_DIR?.trim();
  return value || undefined;
}

export function getDefaultLinearOAuthCredentialsPath(): string {
  return join(getDataDir(), "linear-oauth.keys.json");
}

export function getLinearOAuthCredentialsPath(): string | undefined {
  const configuredPath = process.env.LINEAR_OAUTH_CREDENTIALS?.trim();
  if (configuredPath && existsSync(configuredPath)) {
    return configuredPath;
  }

  const defaultPath = getDefaultLinearOAuthCredentialsPath();
  if (existsSync(defaultPath)) {
    return defaultPath;
  }

  return configuredPath || undefined;
}

export function getLinearOAuthTokenPath(): string {
  return join(getDataDir(), "linear-oauth-tokens.json");
}

export interface LinearOAuthClientCredentials {
  client_id: string;
  client_secret: string;
}

/** Deploy-time OAuth app credentials (e.g. bundled in ~/.backsteros-agent/.env or process env). */
export function getLinearOAuthCredentialsFromEnv(): LinearOAuthClientCredentials | null {
  const clientId = process.env.LINEAR_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.LINEAR_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { client_id: clientId, client_secret: clientSecret };
}

export function isLinearOAuthCredentialsFromEnv(): boolean {
  return getLinearOAuthCredentialsFromEnv() !== null;
}

export function getLinearOAuthClientCredentials(): LinearOAuthClientCredentials {
  const fromEnv = getLinearOAuthCredentialsFromEnv();
  if (fromEnv) return fromEnv;

  const credentialsPath = getLinearOAuthCredentialsPath();
  if (!credentialsPath) {
    throw new Error("Linear OAuth credentials path is missing");
  }

  const keys = JSON.parse(readFileSync(credentialsPath, "utf8")) as Record<string, unknown>;
  if (keys.client_id && keys.client_secret) {
    return {
      client_id: String(keys.client_id),
      client_secret: String(keys.client_secret),
    };
  }

  throw new Error("Invalid Linear OAuth credentials file format");
}

export function isLinearOAuthConfigured(): boolean {
  if (isLinearOAuthCredentialsFromEnv()) return true;
  const credentialsPath = getLinearOAuthCredentialsPath();
  return Boolean(credentialsPath && existsSync(credentialsPath));
}

export function isLinearOAuthAuthenticated(): boolean {
  const tokenPath = getLinearOAuthTokenPath();
  if (!existsSync(tokenPath)) return false;

  try {
    const parsed = JSON.parse(readFileSync(tokenPath, "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object") return false;
    const record = parsed as Record<string, unknown>;
    return typeof record.access_token === "string" && Boolean(record.access_token.trim());
  } catch {
    return false;
  }
}

export function getDefaultGoogleOAuthCredentialsPath(): string {
  return join(getDataDir(), "google-oauth.keys.json");
}

export function getGoogleOAuthCredentialsPath(): string | undefined {
  return process.env.GOOGLE_OAUTH_CREDENTIALS?.trim() || undefined;
}

/** Default Google Calendar account nickname for this install (override via GOOGLE_CALENDAR_ACCOUNT). */
export const DEFAULT_GOOGLE_CALENDAR_ACCOUNT = "personal";

export function getGoogleCalendarAccountId(): string {
  const value = process.env.GOOGLE_CALENDAR_ACCOUNT?.trim();
  return value || DEFAULT_GOOGLE_CALENDAR_ACCOUNT;
}

export function getGoogleCalendarTokenPath(): string {
  return join(getDataDir(), "google-calendar-tokens.json");
}

export function isGoogleCalendarConfigured(): boolean {
  const credentialsPath = getGoogleOAuthCredentialsPath();
  return Boolean(credentialsPath && existsSync(credentialsPath));
}

export function isGoogleCalendarAuthenticated(): boolean {
  const tokenPath = getGoogleCalendarTokenPath();
  if (!existsSync(tokenPath)) return false;

  try {
    const parsed = JSON.parse(readFileSync(tokenPath, "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object") return false;

    const record = parsed as Record<string, unknown>;
    if (typeof record.access_token === "string") {
      return true;
    }

    return Object.values(record).some((tokens) => {
      if (!tokens || typeof tokens !== "object") return false;
      const tokenRecord = tokens as Record<string, unknown>;
      return typeof tokenRecord.access_token === "string" || typeof tokenRecord.refresh_token === "string";
    });
  } catch {
    return false;
  }
}

export function getTotemEnvPath(): string {
  return join(getDataDir(), "totem.env");
}

const WHOOP_TOKEN_KEYS = [
  "WHOOP_EMAIL",
  "WHOOP_IOS_BEARER_TOKEN",
  "WHOOP_COGNITO_REFRESH_TOKEN",
  "WHOOP_USER_ID",
  "WHOOP_INSTALLATION_ID",
] as const;

export function getWhoopEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of WHOOP_TOKEN_KEYS) {
    const value = process.env[key]?.trim();
    if (value) env[key] = value;
  }
  return env;
}

export function isWhoopAuthenticated(): boolean {
  const env = getWhoopEnv();
  return Boolean(env.WHOOP_COGNITO_REFRESH_TOKEN || env.WHOOP_IOS_BEARER_TOKEN);
}

export function isWhoopConfigured(): boolean {
  return isWhoopAuthenticated() || existsSync(getTotemEnvPath());
}

export const AUTO_MODEL_ID = "composer-2.5";
export const MAX_MODEL_ID_FALLBACK = "claude-opus-4-8";
/** @deprecated Use AUTO_MODEL_ID */
export const DEFAULT_MODEL = AUTO_MODEL_ID;
