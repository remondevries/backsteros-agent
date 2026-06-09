import type { ModelMode } from "./types";

export function modelDisplayNameForMode(mode: ModelMode): string {
  return mode === "max" ? "Opus 4.8" : "Composer 2.5";
}
