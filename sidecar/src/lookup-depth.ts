import { GEMINI_LOOKUP_MODEL } from "./config.ts";

export type LookupDepthMode = "fast" | "deep";

const DEFAULT_FAST_MODEL = "gemini-2.5-flash";
const DEFAULT_DEEP_MODEL = "gemini-2.5-flash";

export function normalizeLookupDepthMode(value: string | undefined): LookupDepthMode {
  return value === "deep" ? "deep" : "fast";
}

export function resolveLookupModelId(mode: LookupDepthMode): string {
  if (mode === "deep") {
    return (
      process.env.GEMINI_LOOKUP_MODEL_DEEP?.trim() ||
      process.env.GEMINI_LOOKUP_MODEL?.trim() ||
      GEMINI_LOOKUP_MODEL ||
      DEFAULT_DEEP_MODEL
    );
  }

  return (
    process.env.GEMINI_LOOKUP_MODEL_FAST?.trim() ||
    process.env.GEMINI_LOOKUP_MODEL?.trim() ||
    GEMINI_LOOKUP_MODEL ||
    DEFAULT_FAST_MODEL
  );
}

export function resolveLookupThinkingBudget(mode: LookupDepthMode): number {
  if (mode === "fast") {
    return 0;
  }

  const configured = process.env.GEMINI_LOOKUP_THINKING_BUDGET_DEEP?.trim();
  if (configured) {
    const parsed = Number.parseInt(configured, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return -1;
}

export function buildLookupGenerationConfig(mode: LookupDepthMode): {
  thinkingConfig: { thinkingBudget: number };
} {
  return {
    thinkingConfig: {
      thinkingBudget: resolveLookupThinkingBudget(mode),
    },
  };
}
