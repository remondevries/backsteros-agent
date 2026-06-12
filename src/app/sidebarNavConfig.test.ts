import { describe, expect, test } from "bun:test";
import { isSidebarPrimaryNavItem, shouldShowPrimaryNavEmptyState } from "../app/sidebarNavConfig";

describe("isSidebarPrimaryNavItem", () => {
  test("matches top navigation items only", () => {
    expect(isSidebarPrimaryNavItem("inbox")).toBe(true);
    expect(isSidebarPrimaryNavItem("daily")).toBe(true);
    expect(isSidebarPrimaryNavItem("workouts")).toBe(true);
    expect(isSidebarPrimaryNavItem("projects")).toBe(false);
    expect(isSidebarPrimaryNavItem("meetings")).toBe(false);
  });
});

describe("shouldShowPrimaryNavEmptyState", () => {
  test("shows empty state for inbox and workouts but not daily", () => {
    expect(shouldShowPrimaryNavEmptyState("inbox")).toBe(true);
    expect(shouldShowPrimaryNavEmptyState("workouts")).toBe(true);
    expect(shouldShowPrimaryNavEmptyState("daily")).toBe(false);
    expect(shouldShowPrimaryNavEmptyState("projects")).toBe(false);
  });
});
