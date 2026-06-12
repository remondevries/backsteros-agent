import { describe, expect, test } from "bun:test";
import {
  isSidebarNavItemId,
  isVaultSidebarNavItem,
  sidebarNavItemLabel,
} from "./sidebarNavItems";

describe("sidebarNavItems", () => {
  test("recognizes vault and projects nav ids", () => {
    expect(isSidebarNavItemId("inbox")).toBe(true);
    expect(isSidebarNavItemId("projects")).toBe(true);
    expect(isSidebarNavItemId("unknown")).toBe(false);
  });

  test("labels projects separately from vault folders", () => {
    expect(sidebarNavItemLabel("projects")).toBe("Projects");
    expect(sidebarNavItemLabel("inbox")).toBe("Inbox");
  });

  test("distinguishes vault items from projects", () => {
    expect(isVaultSidebarNavItem("inbox")).toBe(true);
    expect(isVaultSidebarNavItem("projects")).toBe(false);
  });
});
