import { SIDEBAR_PRIMARY_ITEMS, SIDEBAR_SECTIONS } from "../app/sidebarNavConfig";
import { sidebarNavItemLabel, type SidebarNavItemId } from "../lib/sidebarNavItems";

export type NavigationLeaderShortcutBinding = {
  keys: string;
  hint: string;
  navItemId: SidebarNavItemId;
};

const NAV_ITEM_SHORTCUT_LETTERS: Record<SidebarNavItemId, string> = {
  inbox: "i",
  daily: "d",
  workouts: "w",
  projects: "p",
  meetings: "m",
  financials: "f",
  "knowledge-base": "k",
  letters: "l",
  organizations: "o",
  contacts: "c",
};

const SIDEBAR_NAV_ORDER = [
  ...SIDEBAR_PRIMARY_ITEMS,
  ...SIDEBAR_SECTIONS.flatMap((section) => section.items),
];

export const SIDEBAR_NAV_ITEM_IDS: SidebarNavItemId[] = SIDEBAR_NAV_ORDER.map((item) => item.id);

export type SidebarNavCycleDirection = "up" | "down";

export function getAdjacentSidebarNavItem(
  current: SidebarNavItemId | null,
  direction: SidebarNavCycleDirection,
): SidebarNavItemId {
  const ids = SIDEBAR_NAV_ITEM_IDS;
  if (ids.length === 0) {
    return current ?? "inbox";
  }

  if (current === null) {
    return direction === "down" ? ids[0]! : ids[ids.length - 1]!;
  }

  const index = ids.indexOf(current);
  if (index < 0) {
    return direction === "down" ? ids[0]! : ids[ids.length - 1]!;
  }

  const delta = direction === "down" ? 1 : -1;
  const nextIndex = (index + delta + ids.length) % ids.length;
  return ids[nextIndex]!;
}

export const NAVIGATION_LEADER_SHORTCUTS: NavigationLeaderShortcutBinding[] =
  SIDEBAR_NAV_ORDER.map((item) => {
    const letter = NAV_ITEM_SHORTCUT_LETTERS[item.id];
    return {
      keys: `g>${letter}`,
      hint: `G ${letter.toUpperCase()}`,
      navItemId: item.id,
    };
  });

export const SETTINGS_LEADER_SHORTCUT = {
  keys: "g>s",
  hint: "G S",
} as const;

const NAVIGATION_SHORTCUT_HINTS = Object.fromEntries(
  NAVIGATION_LEADER_SHORTCUTS.map((binding) => [binding.navItemId, binding.hint]),
) as Record<SidebarNavItemId, string>;

export function navigationShortcutHint(navItemId: SidebarNavItemId): string | undefined {
  return NAVIGATION_SHORTCUT_HINTS[navItemId];
}

export function navigationShortcutLabel(navItemId: SidebarNavItemId): string {
  return sidebarNavItemLabel(navItemId);
}
