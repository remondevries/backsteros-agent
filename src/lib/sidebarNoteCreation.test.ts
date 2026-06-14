import { describe, expect, test } from "bun:test";
import {
  isSidebarNoteCreationShortcutBlocked,
  registerSidebarNoteCreation,
  triggerSidebarNoteCreation,
} from "./sidebarNoteCreation";
import { supportsSidebarNoteCreation } from "./sidebarNoteCreationNavItems";

describe("sidebarNoteCreationNavItems", () => {
  test("supports note creation for vault sections with a sidebar add button", () => {
    expect(supportsSidebarNoteCreation("inbox")).toBe(true);
    expect(supportsSidebarNoteCreation("meetings")).toBe(true);
    expect(supportsSidebarNoteCreation("knowledge-base")).toBe(true);
    expect(supportsSidebarNoteCreation("letters")).toBe(true);
    expect(supportsSidebarNoteCreation("contacts")).toBe(true);
    expect(supportsSidebarNoteCreation("daily")).toBe(false);
    expect(supportsSidebarNoteCreation("projects")).toBe(false);
  });
});

describe("sidebarNoteCreation", () => {
  test("triggers the registered create handler", () => {
    let called = 0;
    const unregister = registerSidebarNoteCreation({
      createNote: () => {
        called += 1;
      },
    });

    expect(triggerSidebarNoteCreation()).toBe(true);
    expect(called).toBe(1);

    unregister();
    expect(triggerSidebarNoteCreation()).toBe(false);
  });

  test("blocks shortcuts outside sidebar search inputs", () => {
    const searchInput = {
      tagName: "INPUT",
      isContentEditable: false,
      matches: (selector: string) => selector.includes("vault-folder-explorer-search-input"),
      closest: () => null,
    } as unknown as HTMLElement;
    expect(isSidebarNoteCreationShortcutBlocked(searchInput)).toBe(false);

    const titleInput = {
      tagName: "INPUT",
      isContentEditable: false,
      matches: () => false,
      closest: () => null,
    } as unknown as HTMLElement;
    expect(isSidebarNoteCreationShortcutBlocked(titleInput)).toBe(true);

    const textarea = {
      tagName: "TEXTAREA",
      isContentEditable: false,
      closest: () => null,
    } as unknown as HTMLElement;
    expect(isSidebarNoteCreationShortcutBlocked(textarea)).toBe(true);
  });
});
