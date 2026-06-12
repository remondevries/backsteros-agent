import { describe, expect, test } from "bun:test";
import { shouldHideDefaultMainContent } from "./ContentPanelMainSlot";

describe("shouldHideDefaultMainContent", () => {
  test("hides main content when browsing projects without a team or project", () => {
    expect(
      shouldHideDefaultMainContent({
        activeVaultNavItem: "projects",
        linearSelection: null,
        hasFocusedContent: false,
      }),
    ).toBe(true);
  });

  test("keeps main content when a project is selected", () => {
    expect(
      shouldHideDefaultMainContent({
        activeVaultNavItem: "projects",
        linearSelection: { kind: "project", id: "p1", name: "BacksterOS" },
        hasFocusedContent: true,
      }),
    ).toBe(false);
  });

  test("hides dashboard views while browsing projects", () => {
    expect(
      shouldHideDefaultMainContent({
        activeVaultNavItem: "projects",
        linearSelection: null,
        hasFocusedContent: false,
      }),
    ).toBe(true);
  });
});
