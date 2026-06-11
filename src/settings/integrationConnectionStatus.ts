import type { IntegrationsStatus } from "../lib/api";
import type { SettingsTabId } from "./settingsTabs";

const INTEGRATION_TABS = new Set<SettingsTabId>([
  "cursor",
  "linear",
  "gemini",
  "google-calendar",
]);

export type SettingsConnectionContext = {
  integrationsStatus: IntegrationsStatus | null;
  savedNotesPath: string | null;
};

export function tabShowsConnectionIndicator(tabId: SettingsTabId): boolean {
  return tabId === "obsidian" || INTEGRATION_TABS.has(tabId);
}

/** @deprecated Use tabShowsConnectionIndicator */
export function isIntegrationSettingsTab(tabId: SettingsTabId): boolean {
  return INTEGRATION_TABS.has(tabId);
}

export function isGoogleCalendarConnected(
  calendar: IntegrationsStatus["googleCalendar"],
): boolean {
  return calendar.credentialsConfigured && calendar.authenticated;
}

export function getGoogleCalendarStatusLabel(
  calendar: IntegrationsStatus["googleCalendar"],
): string {
  if (isGoogleCalendarConnected(calendar)) return "Connected";
  if (calendar.credentialsConfigured) return "Needs sign-in";
  if (calendar.authenticated) return "Missing OAuth credentials";
  return "Not connected";
}

export function isSettingsTabConnected(
  tabId: SettingsTabId,
  context: SettingsConnectionContext,
): boolean {
  if (tabId === "obsidian") {
    return Boolean(context.savedNotesPath?.trim());
  }

  const status = context.integrationsStatus;
  if (!status) return false;

  if (tabId === "cursor") return status.cursorApiKey.configured;
  if (tabId === "linear") return status.linearApiKey.configured;
  if (tabId === "gemini") return status.geminiApiKey.configured;
  if (tabId === "google-calendar") return isGoogleCalendarConnected(status.googleCalendar);

  return false;
}

export function getSettingsTabStatusLabel(
  tabId: SettingsTabId,
  context: SettingsConnectionContext,
): string {
  if (isSettingsTabConnected(tabId, context)) return "Connected";

  if (tabId === "google-calendar" && context.integrationsStatus) {
    return getGoogleCalendarStatusLabel(context.integrationsStatus.googleCalendar);
  }

  return "Not connected";
}

/** @deprecated Use isSettingsTabConnected with SettingsConnectionContext */
export function isIntegrationConnected(
  tabId: SettingsTabId,
  status: IntegrationsStatus | null,
): boolean {
  return isSettingsTabConnected(tabId, { integrationsStatus: status, savedNotesPath: null });
}
