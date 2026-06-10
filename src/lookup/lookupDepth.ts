export type LookupDepthMode = "fast" | "deep";

const STORAGE_KEY = "backster-lookup-depth-mode";
const listeners = new Set<() => void>();

export function readLookupDepthMode(): LookupDepthMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === "deep" ? "deep" : "fast";
  } catch {
    return "fast";
  }
}

export function writeLookupDepthMode(mode: LookupDepthMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Ignore storage failures in restricted environments.
  }
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeLookupDepthMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function lookupDepthLabel(mode: LookupDepthMode): string {
  return mode === "deep" ? "Deep" : "Fast";
}

export function lookupDepthModelName(mode: LookupDepthMode): string {
  return mode === "deep" ? "Gemini 2.5 Flash · reasoning" : "Gemini 2.5 Flash";
}
