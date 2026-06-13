import { describe, expect, test } from "bun:test";
import { getAdjacentSidebarNavItem, SIDEBAR_NAV_ITEM_IDS } from "./navigationShortcutBindings";

describe("getAdjacentSidebarNavItem", () => {
  test("cycles down through sidebar order", () => {
    expect(getAdjacentSidebarNavItem("inbox", "down")).toBe("daily");
    expect(getAdjacentSidebarNavItem("daily", "down")).toBe("workouts");
    expect(getAdjacentSidebarNavItem("workouts", "down")).toBe("projects");
  });

  test("cycles up through sidebar order", () => {
    expect(getAdjacentSidebarNavItem("daily", "up")).toBe("inbox");
    expect(getAdjacentSidebarNavItem("projects", "up")).toBe("workouts");
  });

  test("wraps at the ends", () => {
    const first = SIDEBAR_NAV_ITEM_IDS[0]!;
    const last = SIDEBAR_NAV_ITEM_IDS[SIDEBAR_NAV_ITEM_IDS.length - 1]!;
    expect(getAdjacentSidebarNavItem(first, "up")).toBe(last);
    expect(getAdjacentSidebarNavItem(last, "down")).toBe(first);
  });

  test("starts from first or last when current is null", () => {
    const first = SIDEBAR_NAV_ITEM_IDS[0]!;
    const last = SIDEBAR_NAV_ITEM_IDS[SIDEBAR_NAV_ITEM_IDS.length - 1]!;
    expect(getAdjacentSidebarNavItem(null, "down")).toBe(first);
    expect(getAdjacentSidebarNavItem(null, "up")).toBe(last);
  });
});
