import type { AppView } from "../app/appViews";
import type { SettingsTabId } from "../settings/settingsTabs";
import { normalizeSettingsTabId } from "../settings/settingsTabs";
import { isSidebarNavItemId, type SidebarNavItemId } from "../lib/sidebarNavItems";

const APP_STATE_STORAGE_KEY = "backsteros.app.state";

const APP_VIEWS = new Set<AppView>(["chat"]);

const SETTINGS_TABS = new Set<SettingsTabId | "connections">([
  "general",
  "account",
  "connections",
  "obsidian",
  "linear",
  "cursor",
  "gemini",
  "google-calendar",
  "google-gmail",
  "whoop",
  "ui-preview",
  "user-management",
]);

export type PersistedAppState = {
  appView?: AppView;
  showSettings?: boolean;
  activeSettingsTab?: SettingsTabId | "connections";
  activeVaultNavItem?: SidebarNavItemId;
};

function readRawState(): PersistedAppState {
  try {
    const raw = localStorage.getItem(APP_STATE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedAppState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function readPersistedAppView(): AppView | null {
  const { appView } = readRawState();
  return appView && APP_VIEWS.has(appView) ? appView : null;
}

export function readPersistedShowSettings(): boolean {
  return Boolean(readRawState().showSettings);
}

export function readPersistedSettingsTab(): SettingsTabId | null {
  const tab = readRawState().activeSettingsTab;
  if (!tab || !SETTINGS_TABS.has(tab)) return null;
  return normalizeSettingsTabId(tab as SettingsTabId);
}

export function readPersistedVaultNavItem(): SidebarNavItemId | null {
  const item = readRawState().activeVaultNavItem;
  return item && isSidebarNavItemId(item) ? item : null;
}

export function writePersistedAppState(patch: PersistedAppState) {
  try {
    const current = readRawState();
    const next: PersistedAppState = { ...current, ...patch };
    localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function clearPersistedAppState() {
  try {
    localStorage.removeItem(APP_STATE_STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
