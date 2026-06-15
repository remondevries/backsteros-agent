import { getVisibleSettingsTabs } from "../settings/settingsTabs";
import { SETTINGS_LEADER_SHORTCUT } from "../shortcuts/navigationShortcutBindings";
import { getSidebarPrimaryItems, getSidebarSections, type LinearSidebarTeamConfig } from "../app/sidebarNavConfig";
import { navigationShortcutHint } from "../shortcuts/navigationShortcutBindings";
import type { CommandPaletteItem } from "./types";

function matchesQuery(value: string, query: string): boolean {
  return value.toLocaleLowerCase().includes(query);
}

export function buildNavigationCommandItems(
  query: string,
  options?: { isAdministrator?: boolean; linearSidebarTeamConfig?: LinearSidebarTeamConfig },
): CommandPaletteItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const items: CommandPaletteItem[] = [];

  const navDefinitions = [
    ...getSidebarPrimaryItems(options?.linearSidebarTeamConfig),
    ...getSidebarSections(options?.linearSidebarTeamConfig).flatMap((section) => section.items),
  ];

  for (const navItem of navDefinitions) {
    if (!matchesQuery(navItem.label, normalizedQuery)) {
      continue;
    }
    items.push({
      kind: "navigate",
      id: `nav-${navItem.id}`,
      section: "Navigate",
      label: navItem.label,
      subtitle:
        navigationShortcutHint(navItem.id, options?.linearSidebarTeamConfig) ?? "Open area",
      navItemId: navItem.id,
    });
  }

  for (const settingsTab of getVisibleSettingsTabs({ isAdministrator: options?.isAdministrator })) {
    const haystack = `${settingsTab.label} ${settingsTab.description}`;
    if (!matchesQuery(haystack, normalizedQuery)) {
      continue;
    }
    items.push({
      kind: "settings",
      id: `settings-${settingsTab.id}`,
      section: "Navigate",
      label: settingsTab.label,
      subtitle: "Settings",
      settingsTab: settingsTab.id,
    });
  }

  if (matchesQuery("settings", normalizedQuery)) {
    items.unshift({
      kind: "settings",
      id: "settings-root",
      section: "Navigate",
      label: "Settings",
      subtitle: SETTINGS_LEADER_SHORTCUT.hint,
    });
  }

  return items;
}
