import { describe, expect, test } from "bun:test";
import {
  IOS_BOTTOM_NAV_MORE_ITEM_IDS,
  IOS_BOTTOM_NAV_TRAY_ITEM_IDS,
  IOS_LIST_SWIPE_NAV_ITEM_IDS,
  isIosBottomNavMoreItem,
  isIosListSwipeNavItem,
} from "./iosNavConfig";

describe("iosNavConfig", () => {
  test("list swipe items include bottom nav tray and list-style more destinations", () => {
    for (const id of IOS_BOTTOM_NAV_TRAY_ITEM_IDS) {
      expect(IOS_LIST_SWIPE_NAV_ITEM_IDS).toContain(id);
    }
    const listStyleMoreDestinations = IOS_BOTTOM_NAV_MORE_ITEM_IDS.filter((id) => id !== "workouts");
    for (const id of listStyleMoreDestinations) {
      expect(IOS_LIST_SWIPE_NAV_ITEM_IDS).toContain(id);
    }
    expect(isIosListSwipeNavItem("workouts")).toBe(false);
  });

  test("knowledge-base is reachable from bottom nav more menu", () => {
    expect(IOS_BOTTOM_NAV_MORE_ITEM_IDS).toContain("knowledge-base");
    expect(isIosListSwipeNavItem("knowledge-base")).toBe(true);
  });

  test("isIosBottomNavMoreItem matches more menu ids", () => {
    expect(isIosBottomNavMoreItem("inbox")).toBe(true);
    expect(isIosBottomNavMoreItem("daily")).toBe(false);
  });
});
