import { describe, expect, test } from "bun:test";
import {
  autoFocusActiveContentList,
  clearContentListKeyboardFocus,
  resolveContentListPreferredRegion,
  type ContentListRegistration,
  type ContentListRegion,
} from "./contentListNavigation";

function createRegistration(
  items: Array<{ id: string; select: () => void }>,
  options?: { region?: "sidebar" | "main"; priority?: number; selectedId?: string | null },
): ContentListRegistration {
  return {
    region: options?.region ?? "sidebar",
    priority: options?.priority ?? 5,
    enabled: true,
    itemsRef: { current: items },
    selectedIdRef: { current: options?.selectedId ?? null },
  };
}

describe("autoFocusActiveContentList", () => {
  test("focuses the first item when nothing is focused", () => {
    const registrations = new Map<string, ContentListRegistration>([
      ["sidebar", createRegistration([{ id: "a", select: () => {} }, { id: "b", select: () => {} }])],
    ]);
    const focusedIdRef = { current: null as string | null };
    let focusedId: string | null = null;

    expect(
      autoFocusActiveContentList(registrations, focusedIdRef, (id) => {
        focusedId = id;
      }),
    ).toBe(true);

    expect(focusedId).toBe("a");
    expect(focusedIdRef.current).toBe("a");
  });

  test("prefers the selected item when available", () => {
    const registrations = new Map<string, ContentListRegistration>([
      [
        "sidebar",
        createRegistration(
          [{ id: "a", select: () => {} }, { id: "b", select: () => {} }],
          { selectedId: "b" },
        ),
      ],
    ]);
    const focusedIdRef = { current: null as string | null };
    let focusedId: string | null = null;

    autoFocusActiveContentList(registrations, focusedIdRef, (id) => {
      focusedId = id;
    });

    expect(focusedId).toBe("b");
  });

  test("keeps a valid existing focus in the active list", () => {
    const registrations = new Map<string, ContentListRegistration>([
      ["sidebar", createRegistration([{ id: "a", select: () => {} }, { id: "b", select: () => {} }])],
    ]);
    const focusedIdRef = { current: "b" as string | null };
    let focusedId: string | null = "b";

    autoFocusActiveContentList(registrations, focusedIdRef, (id) => {
      focusedId = id;
    });

    expect(focusedId).toBe("b");
  });

  test("prefers the higher-priority registration when no preferred region is set", () => {
    const registrations = new Map<string, ContentListRegistration>([
      ["sidebar", createRegistration([{ id: "sidebar-item", select: () => {} }])],
      [
        "main",
        createRegistration([{ id: "main-item", select: () => {} }], {
          region: "main",
          priority: 10,
        }),
      ],
    ]);
    const focusedIdRef = { current: null as string | null };
    let focusedId: string | null = null;

    autoFocusActiveContentList(registrations, focusedIdRef, (id) => {
      focusedId = id;
    });

    expect(focusedId).toBe("main-item");
  });

  test("prefers the sidebar list when the layout prefers sidebar", () => {
    const registrations = new Map<string, ContentListRegistration>([
      ["sidebar", createRegistration([{ id: "sidebar-item", select: () => {} }])],
      [
        "main",
        createRegistration([{ id: "main-item", select: () => {} }], {
          region: "main",
          priority: 10,
        }),
      ],
    ]);
    const preferredListRegionRef = { current: "sidebar" as ContentListRegion };
    const focusedIdRef = { current: null as string | null };
    let focusedId: string | null = null;

    autoFocusActiveContentList(
      registrations,
      focusedIdRef,
      (id) => {
        focusedId = id;
      },
      preferredListRegionRef,
    );

    expect(focusedId).toBe("sidebar-item");
  });

  test("prefers the main list when the layout prefers main", () => {
    const registrations = new Map<string, ContentListRegistration>([
      ["sidebar", createRegistration([{ id: "sidebar-item", select: () => {} }])],
      [
        "main",
        createRegistration([{ id: "main-item", select: () => {} }], {
          region: "main",
          priority: 10,
        }),
      ],
    ]);
    const preferredListRegionRef = { current: "main" as ContentListRegion };
    const focusedIdRef = { current: null as string | null };
    let focusedId: string | null = null;

    autoFocusActiveContentList(
      registrations,
      focusedIdRef,
      (id) => {
        focusedId = id;
      },
      preferredListRegionRef,
    );

    expect(focusedId).toBe("main-item");
  });
});

describe("resolveContentListPreferredRegion", () => {
  test("prefers sidebar when the content sidebar is visible", () => {
    expect(
      resolveContentListPreferredRegion({ settingsOpen: false, hideSidebar: false }),
    ).toBe("sidebar");
  });

  test("prefers main when the content sidebar is hidden", () => {
    expect(
      resolveContentListPreferredRegion({ settingsOpen: false, hideSidebar: true }),
    ).toBe("main");
  });

  test("returns null in settings", () => {
    expect(
      resolveContentListPreferredRegion({ settingsOpen: true, hideSidebar: false }),
    ).toBeNull();
  });
});

describe("clearContentListKeyboardFocus", () => {
  test("clears the current focus", () => {
    const focusedIdRef = { current: "a" as string | null };
    let focusedId: string | null = "a";

    clearContentListKeyboardFocus(focusedIdRef, (id) => {
      focusedId = id;
    });

    expect(focusedId).toBeNull();
    expect(focusedIdRef.current).toBeNull();
  });
});
