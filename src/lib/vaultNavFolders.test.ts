import { describe, expect, test } from "bun:test";
import {
  VAULT_NAV_FOLDER_NAMES,
  VAULT_NAV_ITEMS,
  isVaultNavItemId,
  vaultFolderForNavItem,
} from "./vaultNavFolders";

describe("vaultNavFolders", () => {
  test("maps every nav item to a folder label", () => {
    for (const item of VAULT_NAV_ITEMS) {
      expect(vaultFolderForNavItem(item.id)).toBe(item.label);
    }
  });

  test("uses the predefined local vault folder names", () => {
    expect(VAULT_NAV_FOLDER_NAMES).toEqual([
      "Inbox",
      "Daily",
      "Workouts",
      "Meetings",
      "Financials",
      "Knowledge Base",
      "Letters",
      "Organizations",
      "Contacts",
    ]);
  });

  test("recognizes vault nav ids", () => {
    expect(isVaultNavItemId("inbox")).toBe(true);
    expect(isVaultNavItemId("projects")).toBe(false);
  });
});
