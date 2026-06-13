import { useSyncExternalStore } from "react";

export type TerminalPreferences = {
  terminalFontFamily: string;
  terminalFontSize: number;
  zoomLevel: number;
  terminalLetterSpacing: number;
  terminalScrollback: number;
  terminalWebglEnabled: boolean;
  terminalCursorBlink: boolean;
  backgroundKind: "solid" | "image";
  backgroundImageId: string | null;
};

const STORAGE_KEY = "backsteros.terminal.preferences";

export const DEFAULT_TERMINAL_PREFERENCES: TerminalPreferences = {
  terminalFontFamily: "",
  terminalFontSize: 12,
  zoomLevel: 1,
  terminalLetterSpacing: 0,
  terminalScrollback: 10000,
  terminalWebglEnabled: true,
  terminalCursorBlink: true,
  backgroundKind: "solid",
  backgroundImageId: null,
};

type Listener = () => void;
const listeners = new Set<Listener>();

let state: TerminalPreferences = { ...DEFAULT_TERMINAL_PREFERENCES };

function loadFromStorage(): TerminalPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_TERMINAL_PREFERENCES };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TERMINAL_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<TerminalPreferences>;
    return { ...DEFAULT_TERMINAL_PREFERENCES, ...parsed };
  } catch {
    return { ...DEFAULT_TERMINAL_PREFERENCES };
  }
}

function persist(next: TerminalPreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

state = loadFromStorage();

export const terminalPreferencesStore = {
  getState(): TerminalPreferences {
    return state;
  },
  setState(partial: Partial<TerminalPreferences>): void {
    state = { ...state, ...partial };
    persist(state);
    emit();
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useTerminalPreferences(): TerminalPreferences {
  return useSyncExternalStore(
    terminalPreferencesStore.subscribe,
    terminalPreferencesStore.getState,
    () => DEFAULT_TERMINAL_PREFERENCES,
  );
}

/** Terax-compatible alias used by the renderer pool. */
export const usePreferencesStore = {
  getState: terminalPreferencesStore.getState,
};
