import { describe, expect, test } from "bun:test";
import {
  getSidebarPrimaryItems,
  getSidebarSections,
  isSidebarPrimaryNavItem,
  shouldShowPrimaryNavEmptyState,
} from "../app/sidebarNavConfig";

describe("getSidebarPrimaryItems", () => {
  test("returns inbox, daily, and workouts without waiting for linear team config", () => {
    const items = getSidebarPrimaryItems();
    expect(items.map((item) => item.id)).toEqual(["inbox", "daily", "workouts"]);
  });

  test("returns the same primary items when team config is empty", () => {
    const items = getSidebarPrimaryItems({});
    expect(items.map((item) => item.id)).toEqual(["inbox", "daily", "workouts"]);
  });
});

describe("getSidebarSections", () => {
  test("returns workspace and people sections without waiting for linear team config", () => {
    const sections = getSidebarSections();
    expect(sections.map((section) => section.id)).toEqual(["workspace", "people"]);
    expect(sections[0]?.items.map((item) => item.id)).toEqual([
      "projects",
      "meetings",
      "knowledge-base",
      "letters",
    ]);
    expect(sections[1]?.items.map((item) => item.id)).toEqual(["organizations", "contacts"]);
  });
});

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
