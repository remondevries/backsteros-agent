import { SETTINGS_TABS } from "../settings/settingsTabs";
import { SIDEBAR_PRIMARY_ITEMS, SIDEBAR_SECTIONS } from "../app/sidebarNavConfig";
import type { CommandPaletteItem } from "./types";

function matchesQuery(value: string, query: string): boolean {
  return value.toLocaleLowerCase().includes(query);
}

export function buildNavigationCommandItems(query: string): CommandPaletteItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const items: CommandPaletteItem[] = [];

  const navDefinitions = [
    ...SIDEBAR_PRIMARY_ITEMS,
    ...SIDEBAR_SECTIONS.flatMap((section) => section.items),
  ];

  for (const navItem of navDefinitions) {
    if (normalizedQuery && !matchesQuery(navItem.label, normalizedQuery)) {
      continue;
    }
    items.push({
      kind: "navigate",
      id: `nav-${navItem.id}`,
      section: "Navigate",
      label: navItem.label,
      subtitle: "Open area",
      navItemId: navItem.id,
    });
  }

  for (const settingsTab of SETTINGS_TABS) {
    if (!normalizedQuery) continue;
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

  if (!normalizedQuery || matchesQuery("settings", normalizedQuery)) {
    items.unshift({
      kind: "settings",
      id: "settings-root",
      section: "Navigate",
      label: "Settings",
      subtitle: "Open settings",
    });
  }

  return items;
}
