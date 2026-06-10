import { afterEach, describe, expect, test } from "bun:test";
import {
  buildLookupGenerationConfig,
  normalizeLookupDepthMode,
  resolveLookupModelId,
  resolveLookupThinkingBudget,
} from "./lookup-depth.ts";

describe("lookup depth", () => {
  const envKeys = [
    "GEMINI_LOOKUP_MODEL",
    "GEMINI_LOOKUP_MODEL_FAST",
    "GEMINI_LOOKUP_MODEL_DEEP",
    "GEMINI_LOOKUP_THINKING_BUDGET_DEEP",
  ] as const;

  const originalEnv: Partial<Record<(typeof envKeys)[number], string | undefined>> = {};

  afterEach(() => {
    for (const key of envKeys) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  test("normalizes depth mode", () => {
    expect(normalizeLookupDepthMode("fast")).toBe("fast");
    expect(normalizeLookupDepthMode("deep")).toBe("deep");
    expect(normalizeLookupDepthMode("max")).toBe("fast");
    expect(normalizeLookupDepthMode(undefined)).toBe("fast");
  });

  test("resolves fast and deep models from env overrides", () => {
    for (const key of envKeys) {
      originalEnv[key] = process.env[key];
    }

    process.env.GEMINI_LOOKUP_MODEL_FAST = "gemini-2.5-flash-lite";
    process.env.GEMINI_LOOKUP_MODEL_DEEP = "gemini-2.5-pro";

    expect(resolveLookupModelId("fast")).toBe("gemini-2.5-flash-lite");
    expect(resolveLookupModelId("deep")).toBe("gemini-2.5-pro");
  });

  test("uses thinking budget 0 for fast and dynamic thinking for deep", () => {
    expect(resolveLookupThinkingBudget("fast")).toBe(0);
    expect(resolveLookupThinkingBudget("deep")).toBe(-1);
    expect(buildLookupGenerationConfig("deep")).toEqual({
      thinkingConfig: { thinkingBudget: -1 },
    });
  });

  test("honors configured deep thinking budget", () => {
    for (const key of envKeys) {
      originalEnv[key] = process.env[key];
    }

    process.env.GEMINI_LOOKUP_THINKING_BUDGET_DEEP = "8192";
    expect(resolveLookupThinkingBudget("deep")).toBe(8192);
  });
});
