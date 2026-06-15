import type { SidebarNavItemId } from "./sidebarNavItems";

/** Areas that use iOS inline list + swipe overlay sidebar behavior. */
export const IOS_LIST_SWIPE_NAV_ITEM_IDS = [
  "inbox",
  "daily",
  "meetings",
  "projects",
  "letters",
  "knowledge-base",
  "organizations",
  "contacts",
] as const satisfies readonly SidebarNavItemId[];

/** Primary tray items on the fixed iOS bottom nav bar. */
export const IOS_BOTTOM_NAV_TRAY_ITEM_IDS = [
  "daily",
  "meetings",
  "projects",
  "letters",
] as const satisfies readonly SidebarNavItemId[];

/** Destinations in the bottom nav “More” menu. */
export const IOS_BOTTOM_NAV_MORE_ITEM_IDS = [
  "inbox",
  "workouts",
  "knowledge-base",
  "organizations",
  "contacts",
] as const satisfies readonly SidebarNavItemId[];

const IOS_LIST_SWIPE_NAV_ITEMS = new Set<SidebarNavItemId>(IOS_LIST_SWIPE_NAV_ITEM_IDS);
const IOS_BOTTOM_NAV_MORE_SET = new Set<SidebarNavItemId>(IOS_BOTTOM_NAV_MORE_ITEM_IDS);

export function isIosListSwipeNavItem(
  navItem: SidebarNavItemId | null,
): navItem is SidebarNavItemId {
  return navItem != null && IOS_LIST_SWIPE_NAV_ITEMS.has(navItem);
}

export function isIosProjectsTableSidebarLayout(
  activeVaultNavItem: SidebarNavItemId | null,
  iosListNavEnabled: boolean,
): boolean {
  return iosListNavEnabled && activeVaultNavItem === "projects";
}

export function isIosBottomNavMoreItem(navItem: SidebarNavItemId | null): boolean {
  return navItem != null && IOS_BOTTOM_NAV_MORE_SET.has(navItem);
}
