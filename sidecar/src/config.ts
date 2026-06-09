import { homedir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

function loadDotEnvFile(path: string) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnvFile(join(homedir(), ".backsteros-agent", ".env"));
loadDotEnvFile(join(homedir(), ".backsteros-agent", "totem.env"));

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
  return process.env.SIDECAR_TOKEN ?? randomBytes(24).toString("hex");
}

export function getSidecarPort(): number {
  return Number(process.env.SIDECAR_PORT ?? 3847);
}

export function getCursorApiKey(): string | undefined {
  return process.env.CURSOR_API_KEY;
}

export function getNotesDirOverride(): string | undefined {
  const value = process.env.NOTES_DIR?.trim();
  return value || undefined;
}

export function getLinearApiKey(): string | undefined {
  return process.env.LINEAR_API_KEY?.trim() || undefined;
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
