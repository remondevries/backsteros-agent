import { isLinearProductMode } from "../lib/productMode";

export type SettingsTabId =
  | "general"
  | "account"
  | "cursor"
  | "linear"
  | "gemini"
  | "google-calendar"
  | "google-gmail"
  | "obsidian"
  | "whoop"
  | "ui-preview"
  | "user-management"
  | "connections";

export type SettingsTabGroup =
  | "general"
  | "integration"
  | "extension"
  | "development-testing"
  | "administrator";

/** Tabs shown in the settings sidebar. */
export const SETTINGS_NAV_TABS: {
  id: SettingsTabId;
  label: string;
  description: string;
  group: SettingsTabGroup;
}[] = [
  {
    id: "account",
    label: "Account",
    description: "Your Linear identity, account data, and server sign-in",
    group: "general",
  },
  {
    id: "general",
    label: "Development platform",
    description: "Projects folder for Issue Terminal",
    group: "general",
  },
  {
    id: "linear",
    label: "Linear",
    description: "API key, OAuth, issue links, and grocery list project",
    group: "integration",
  },
  {
    id: "cursor",
    label: "Cursor",
    description: "API key, composer mode, agent profiles, and model selection",
    group: "integration",
  },
  {
    id: "gemini",
    label: "Gemini",
    description: "API key for lookup and extraction",
    group: "development-testing",
  },
  {
    id: "google-calendar",
    label: "Google Calendar",
    description: "OAuth and calendar access",
    group: "development-testing",
  },
  {
    id: "google-gmail",
    label: "Google Gmail",
    description: "OAuth and inbox access",
    group: "development-testing",
  },
  {
    id: "obsidian",
    label: "Local vault",
    description: "Local notes folder and vault name",
    group: "extension",
  },
  {
    id: "whoop",
    label: "Whoop",
    description: "Recovery, sleep, and strain data via Totem",
    group: "development-testing",
  },
  {
    id: "ui-preview",
    label: "UI Preview",
    description: "Preview run UI fixtures for development",
    group: "administrator",
  },
  {
    id: "user-management",
    label: "User management",
    description: "All stored per-user account files on this server",
    group: "administrator",
  },
];

export const SETTINGS_TABS = SETTINGS_NAV_TABS;

/** Sidebar order within the General settings group. */
const GENERAL_GROUP_TAB_ORDER: SettingsTabId[] = ["account", "general"];

function orderSettingsNavTabs<T extends { id: SettingsTabId; group: SettingsTabGroup }>(tabs: T[]): T[] {
  const baseOrder = new Map(tabs.map((tab, index) => [tab.id, index]));
  return [...tabs].sort((a, b) => {
    const aPreferred = GENERAL_GROUP_TAB_ORDER.indexOf(a.id);
    const bPreferred = GENERAL_GROUP_TAB_ORDER.indexOf(b.id);
    if (aPreferred !== -1 && bPreferred !== -1) {
      return aPreferred - bPreferred;
    }
    return (baseOrder.get(a.id) ?? 0) - (baseOrder.get(b.id) ?? 0);
  });
}

const INTEGRATION_TAB_IDS = new Set<SettingsTabId>([
  "account",
  "cursor",
  "linear",
  "gemini",
  "google-calendar",
  "google-gmail",
  "obsidian",
  "whoop",
]);

const ADMINISTRATOR_TAB_IDS = new Set<SettingsTabId>(["ui-preview", "user-management"]);

const DEVELOPMENT_TESTING_TAB_IDS = new Set<SettingsTabId>([
  "gemini",
  "google-calendar",
  "google-gmail",
  "whoop",
]);

const ADMIN_ONLY_SETTINGS_GROUPS = new Set<SettingsTabGroup>([
  "development-testing",
  "administrator",
]);

export function isIntegrationNavTab(tabId: SettingsTabId): boolean {
  return INTEGRATION_TAB_IDS.has(tabId);
}

export function isDevelopmentTestingNavTab(tabId: SettingsTabId): boolean {
  return DEVELOPMENT_TESTING_TAB_IDS.has(tabId);
}

export function isAdministratorNavTab(tabId: SettingsTabId): boolean {
  return ADMINISTRATOR_TAB_IDS.has(tabId);
}

export function isAdminOnlySettingsNavTab(tabId: SettingsTabId): boolean {
  const tab = SETTINGS_NAV_TABS.find((entry) => entry.id === tabId);
  return tab ? ADMIN_ONLY_SETTINGS_GROUPS.has(tab.group) : false;
}

/** @deprecated Persisted tab id from before integrations sidebar refactor. */
export function isLegacyConnectionsSettingsTab(tabId: string): boolean {
  return tabId === "connections";
}

export function normalizeSettingsTabId(tabId: SettingsTabId): SettingsTabId {
  if (tabId === "connections") {
    return "account";
  }
  return tabId;
}

export function getVisibleSettingsTabs(options?: { isAdministrator?: boolean }) {
  let navTabs = isLinearProductMode()
    ? SETTINGS_NAV_TABS.filter((tab) => tab.id !== "obsidian")
    : SETTINGS_NAV_TABS;

  if (!options?.isAdministrator) {
    navTabs = navTabs.filter((tab) => !ADMIN_ONLY_SETTINGS_GROUPS.has(tab.group));
  }

  return orderSettingsNavTabs(navTabs);
}
