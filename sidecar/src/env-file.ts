import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

function getDefaultDataDir(): string {
  return process.env.BACKSTER_DATA_DIR ?? join(homedir(), ".backsteros-agent");
}

export function getEnvFilePath(): string {
  return join(getDefaultDataDir(), ".env");
}

export function getTotemEnvFilePath(): string {
  return join(getDefaultDataDir(), "totem.env");
}

export function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};

  const result: Record<string, string> = {};
  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    result[key] = value;
  }
  return result;
}

export function mergeEnvFile(path: string, updates: Record<string, string | null | undefined>): void {
  const lines = existsSync(path) ? readFileSync(path, "utf8").split("\n") : [];
  const merged = readEnvFile(path);
  const keysToWrite = new Set<string>();

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    keysToWrite.add(key);
    if (value === null || value === "") {
      delete merged[key];
    } else {
      merged[key] = value;
    }
  }

  const output: string[] = [];
  const written = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      output.push(line);
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      output.push(line);
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    if (!keysToWrite.has(key)) {
      output.push(line);
      written.add(key);
      continue;
    }
    if (key in merged) {
      output.push(`${key}=${merged[key]}`);
      written.add(key);
    }
  }

  for (const [key, value] of Object.entries(merged)) {
    if (!written.has(key)) {
      output.push(`${key}=${value}`);
    }
  }

  while (output.length > 0 && output[output.length - 1] === "") {
    output.pop();
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, output.length > 0 ? `${output.join("\n")}\n` : "", { mode: 0o600 });
  try {
    chmodSync(path, 0o600);
  } catch {
    // Best effort on platforms that restrict chmod.
  }
}

export function applyEnvRecord(record: Record<string, string>, overwrite = false): void {
  for (const [key, value] of Object.entries(record)) {
    if (overwrite || !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const SYNCED_ENV_KEYS = [
  "CURSOR_API_KEY",
  "LINEAR_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_OAUTH_CREDENTIALS",
  "GOOGLE_CALENDAR_ACCOUNT",
] as const;

export function reloadEnvFromDisk(): void {
  const envRecord = readEnvFile(getEnvFilePath());
  for (const key of SYNCED_ENV_KEYS) {
    const value = envRecord[key];
    if (value) {
      process.env[key] = value;
    } else {
      delete process.env[key];
    }
  }
  applyEnvRecord(readEnvFile(getTotemEnvFilePath()), true);
}
