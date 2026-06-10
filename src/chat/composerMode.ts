import type { ExecutionMode, ModelMode } from "./types";

export type ComposerMode = "test" | "auto" | "max";

export function composerModeFromSettings(
  executionMode?: ExecutionMode,
  modelMode?: ModelMode,
): ComposerMode {
  if (executionMode === "test") return "test";
  return modelMode === "max" ? "max" : "auto";
}

export function settingsFromComposerMode(mode: ComposerMode): {
  executionMode: ExecutionMode;
  modelMode: ModelMode;
} {
  if (mode === "test") {
    return { executionMode: "test", modelMode: "auto" };
  }
  return { executionMode: "live", modelMode: mode };
}

export function composerModeDisplayName(mode: ComposerMode, modelName?: string): string {
  if (mode === "test") return "Test mode";
  if (modelName) return modelName;
  return mode === "max" ? "Opus 4.8" : "Composer 2.5";
}
