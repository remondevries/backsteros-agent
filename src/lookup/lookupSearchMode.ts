export type LookupSearchMode = "web" | "docs";

const STORAGE_KEY = "backster-lookup-search-mode";
const listeners = new Set<() => void>();

export function readLookupSearchMode(): LookupSearchMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === "docs" ? "docs" : "web";
  } catch {
    return "web";
  }
}

export function writeLookupSearchMode(mode: LookupSearchMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Ignore storage failures in restricted environments.
  }
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeLookupSearchMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function lookupSearchModeLabel(mode: LookupSearchMode): string {
  return mode === "docs" ? "Docs only" : "Web";
}
