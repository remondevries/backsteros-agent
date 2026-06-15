import { describe, expect, test } from "bun:test";
import {
  resolveContentPanelSidebarPresentation,
  shouldMountIosSidebarOverlay,
  shouldShowContentPanelMainSlot,
} from "./contentPanelSidebarPresentation";

describe("resolveContentPanelSidebarPresentation", () => {
  const base = {
    hideSidebar: false,
    narrowContentLayout: true,
    iosListNavEnabled: true,
    hasDetailView: false,
    narrowContentSidebar: false,
    iosProjectsTableLayout: false,
  };

  test("uses inline list for iOS inbox without detail", () => {
    expect(resolveContentPanelSidebarPresentation(base)).toBe("ios-inline");
  });

  test("uses overlay for iOS inbox with detail", () => {
    expect(
      resolveContentPanelSidebarPresentation({
        ...base,
        hasDetailView: true,
      }),
    ).toBe("ios-overlay");
  });

  test("keeps projects browse in main without mounting inline sidebar", () => {
    expect(
      resolveContentPanelSidebarPresentation({
        ...base,
        iosProjectsTableLayout: true,
      }),
    ).toBe("hidden");
  });

  test("uses Done narrow sidebar only off iOS list-nav mode", () => {
    expect(
      resolveContentPanelSidebarPresentation({
        ...base,
        iosListNavEnabled: false,
        narrowContentSidebar: true,
      }),
    ).toBe("narrow-done");
  });
});

describe("shouldShowContentPanelMainSlot", () => {
  test("hides main slot only for full-width mobile sidebars", () => {
    expect(shouldShowContentPanelMainSlot({ presentation: "ios-inline" })).toBe(false);
    expect(shouldShowContentPanelMainSlot({ presentation: "narrow-done" })).toBe(false);
    expect(shouldShowContentPanelMainSlot({ presentation: "ios-overlay" })).toBe(true);
    expect(shouldShowContentPanelMainSlot({ presentation: "hidden" })).toBe(true);
  });
});

describe("shouldMountIosSidebarOverlay", () => {
  test("mounts overlay layer only when detail is open on iOS list nav", () => {
    expect(
      shouldMountIosSidebarOverlay({
        iosListNavEnabled: true,
        hasDetailView: true,
      }),
    ).toBe(true);
    expect(
      shouldMountIosSidebarOverlay({
        iosListNavEnabled: true,
        hasDetailView: false,
      }),
    ).toBe(false);
  });
});
