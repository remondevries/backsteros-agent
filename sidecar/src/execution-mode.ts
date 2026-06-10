import type { AppSettings } from "./types.ts";
import { loadSettings } from "./store.ts";

export type ExecutionMode = "live" | "test";

const EXECUTION_MODE_ENV = "BACKSTER_EXECUTION_MODE";

export function normalizeExecutionMode(value: string | null | undefined): ExecutionMode | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "live" || normalized === "test") {
    return normalized;
  }
  return null;
}

export function getExecutionModeFromEnv(): ExecutionMode | null {
  return normalizeExecutionMode(process.env[EXECUTION_MODE_ENV]);
}

export function getExecutionMode(settings?: AppSettings): ExecutionMode {
  const fromEnv = getExecutionModeFromEnv();
  if (fromEnv) return fromEnv;

  const resolved = settings ?? loadSettings();
  return normalizeExecutionMode(resolved.executionMode) ?? "live";
}

export function isTestExecutionMode(settings?: AppSettings): boolean {
  return getExecutionMode(settings) === "test";
}
