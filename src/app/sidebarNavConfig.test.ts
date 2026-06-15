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
  test("shows empty state for inbox but not daily, workouts, meetings, or knowledge-base", () => {
    expect(shouldShowPrimaryNavEmptyState("inbox")).toBe(true);
    expect(shouldShowPrimaryNavEmptyState("workouts")).toBe(false);
    expect(shouldShowPrimaryNavEmptyState("meetings")).toBe(false);
    expect(shouldShowPrimaryNavEmptyState("knowledge-base")).toBe(false);
    expect(shouldShowPrimaryNavEmptyState("daily")).toBe(false);
    expect(shouldShowPrimaryNavEmptyState("projects")).toBe(false);
  });
});
