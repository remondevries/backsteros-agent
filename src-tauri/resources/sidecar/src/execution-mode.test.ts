import { afterEach, describe, expect, test } from "bun:test";
import {
  getExecutionMode,
  getExecutionModeFromEnv,
  isTestExecutionMode,
  normalizeExecutionMode,
} from "./execution-mode.ts";
import type { AppSettings } from "./types.ts";

const EXECUTION_MODE_ENV = "BACKSTER_EXECUTION_MODE";
const previousEnv = process.env[EXECUTION_MODE_ENV];

afterEach(() => {
  if (previousEnv === undefined) {
    delete process.env[EXECUTION_MODE_ENV];
  } else {
    process.env[EXECUTION_MODE_ENV] = previousEnv;
  }
});

describe("execution mode", () => {
  test("normalizes execution mode values", () => {
    expect(normalizeExecutionMode("live")).toBe("live");
    expect(normalizeExecutionMode(" TEST ")).toBe("test");
    expect(normalizeExecutionMode("invalid")).toBeNull();
  });

  test("reads execution mode from env override", () => {
    process.env[EXECUTION_MODE_ENV] = "test";
    expect(getExecutionModeFromEnv()).toBe("test");
    expect(getExecutionMode({ executionMode: "live" } as AppSettings)).toBe("test");
    expect(isTestExecutionMode({ executionMode: "live" } as AppSettings)).toBe(true);
  });

  test("falls back to settings then live default", () => {
    delete process.env[EXECUTION_MODE_ENV];
    expect(getExecutionMode({ executionMode: "test" } as AppSettings)).toBe("test");
    expect(getExecutionMode({ executionMode: null } as AppSettings)).toBe("live");
    expect(isTestExecutionMode({ executionMode: null } as AppSettings)).toBe(false);
  });
});
