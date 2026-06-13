import { describe, expect, test } from "bun:test";
import { vaultNavItemIdFromPath } from "./vaultNavFromPath";

describe("vaultNavItemIdFromPath", () => {
  test("maps vault folder names to nav item ids", () => {
    expect(vaultNavItemIdFromPath("Daily/2026-06-13.md")).toBe("daily");
    expect(vaultNavItemIdFromPath("Inbox/idea.md")).toBe("inbox");
    expect(vaultNavItemIdFromPath("Knowledge Base/guide.md")).toBe("knowledge-base");
  });

  test("returns null for unknown folders", () => {
    expect(vaultNavItemIdFromPath("Projects/foo.md")).toBeNull();
    expect(vaultNavItemIdFromPath("note.md")).toBeNull();
  });
});
