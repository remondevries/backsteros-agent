import { buildSidebarNavOrder, type LinearSidebarTeamConfig } from "../app/sidebarNavConfig";
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

const SIDEBAR_NAV_ORDER = buildSidebarNavOrder();

export const SIDEBAR_NAV_ITEM_IDS: SidebarNavItemId[] = SIDEBAR_NAV_ORDER;

export type SidebarNavCycleDirection = "up" | "down";

export function getAdjacentSidebarNavItem(
  current: SidebarNavItemId | null,
  direction: SidebarNavCycleDirection,
  config?: LinearSidebarTeamConfig,
): SidebarNavItemId {
  const ids = config !== undefined ? buildSidebarNavOrder(config) : SIDEBAR_NAV_ORDER;
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

export function buildNavigationLeaderShortcuts(
  config?: LinearSidebarTeamConfig,
): NavigationLeaderShortcutBinding[] {
  return buildSidebarNavOrder(config).map((navItemId) => {
    const letter = NAV_ITEM_SHORTCUT_LETTERS[navItemId];
    return {
      keys: `g>${letter}`,
      hint: `G ${letter.toUpperCase()}`,
      navItemId,
    };
  });
}

export const NAVIGATION_LEADER_SHORTCUTS: NavigationLeaderShortcutBinding[] =
  buildNavigationLeaderShortcuts();

export const SETTINGS_LEADER_SHORTCUT = {
  keys: "g>s",
  hint: "G S",
} as const;

export function navigationShortcutHint(
  navItemId: SidebarNavItemId,
  config?: LinearSidebarTeamConfig,
): string | undefined {
  const hints = Object.fromEntries(
    buildNavigationLeaderShortcuts(config).map((binding) => [binding.navItemId, binding.hint]),
  ) as Partial<Record<SidebarNavItemId, string>>;
  return hints[navItemId];
}

export function navigationShortcutLabel(navItemId: SidebarNavItemId): string {
  return sidebarNavItemLabel(navItemId);
}
