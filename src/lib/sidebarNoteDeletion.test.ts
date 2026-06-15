import { describe, expect, test } from "bun:test";
import {
  isDeletableVaultDocumentPath,
  isSidebarNoteDeletionConfirmOpen,
  isSidebarNoteDeletionShortcutBlocked,
  registerSidebarNoteDeletion,
  resolveSidebarNoteDeletionTarget,
  setSidebarNoteDeletionConfirmOpen,
  triggerSidebarNoteDeletionRequest,
  vaultDocumentDisplayName,
} from "./sidebarNoteDeletion";

describe("sidebarNoteDeletion", () => {
  test("triggers the registered delete handler", () => {
    let called = 0;
    const unregister = registerSidebarNoteDeletion({
      openDeleteConfirm: () => {
        called += 1;
        return true;
      },
    });

    expect(triggerSidebarNoteDeletionRequest()).toBe(true);
    expect(called).toBe(1);

    unregister();
    expect(triggerSidebarNoteDeletionRequest()).toBe(false);
  });

  test("blocks shortcuts outside sidebar search inputs", () => {
    const searchInput = {
      tagName: "INPUT",
      isContentEditable: false,
      matches: (selector: string) => selector.includes("vault-folder-explorer-search-input"),
      closest: () => null,
    } as unknown as HTMLElement;
    expect(isSidebarNoteDeletionShortcutBlocked(searchInput)).toBe(false);

    const titleInput = {
      tagName: "INPUT",
      isContentEditable: false,
      matches: () => false,
      closest: () => null,
    } as unknown as HTMLElement;
    expect(isSidebarNoteDeletionShortcutBlocked(titleInput)).toBe(true);
  });

  test("allows deleting vault markdown notes except workouts and daily", () => {
    expect(isDeletableVaultDocumentPath("Inbox/Note.md")).toBe(true);
    expect(isDeletableVaultDocumentPath("Workouts/session.md")).toBe(false);
    expect(isDeletableVaultDocumentPath("Daily/2024-01-15.md")).toBe(false);
    expect(isDeletableVaultDocumentPath("Inbox/readme.txt")).toBe(false);
  });

  test("resolves delete target from sidebar keyboard focus id", () => {
    expect(resolveSidebarNoteDeletionTarget("Inbox/foo.md")).toBe("Inbox/foo.md");
    expect(resolveSidebarNoteDeletionTarget("Daily/2024-01-15.md")).toBe(null);
    expect(resolveSidebarNoteDeletionTarget("workouts:dashboard")).toBe(null);
    expect(resolveSidebarNoteDeletionTarget(null)).toBe(null);
  });

  test("prefers title for display name", () => {
    expect(vaultDocumentDisplayName("Inbox/foo.md", "My Note")).toBe("My Note");
    expect(vaultDocumentDisplayName("Inbox/foo.md", "")).toBe("foo");
  });

  test("tracks delete confirm open state", () => {
    setSidebarNoteDeletionConfirmOpen(true);
    expect(isSidebarNoteDeletionConfirmOpen()).toBe(true);
    setSidebarNoteDeletionConfirmOpen(false);
    expect(isSidebarNoteDeletionConfirmOpen()).toBe(false);
  });
});
