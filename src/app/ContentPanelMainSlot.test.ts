import { describe, expect, test } from "bun:test";
import { shouldHideDefaultMainContent } from "./ContentPanelMainSlot";

describe("shouldHideDefaultMainContent", () => {
  test("hides main chat when browsing projects without a team or project", () => {
    expect(
      shouldHideDefaultMainContent({
        activeVaultNavItem: "projects",
        activeView: "chat",
        linearSelection: null,
        hasFocusedContent: false,
      }),
    ).toBe(true);
  });

  test("keeps main content when a project is selected", () => {
    expect(
      shouldHideDefaultMainContent({
        activeVaultNavItem: "projects",
        activeView: "chat",
        linearSelection: { kind: "project", id: "p1", name: "BacksterOS" },
        hasFocusedContent: true,
      }),
    ).toBe(false);
  });

  test("keeps dashboard views in the main content area", () => {
    expect(
      shouldHideDefaultMainContent({
        activeVaultNavItem: "projects",
        activeView: "linear",
        linearSelection: null,
        hasFocusedContent: false,
      }),
    ).toBe(false);
  });
});
