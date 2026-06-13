import { describe, expect, test } from "bun:test";
import {
  autoFocusActiveContentList,
  clearContentListKeyboardFocus,
  cycleActiveContentList,
  resolveContentListPreferredRegion,
  resolveNavigationOrderIds,
  type ContentListNavItem,
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

  test("prefers the sidebar list when no preferred region is set", () => {
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

    expect(focusedId).toBe("sidebar-item");
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

describe("resolveNavigationOrderIds", () => {
  test("falls back to item order when no matching elements exist", () => {
    const items: ContentListNavItem[] = [
      { id: "issue-1", select: () => {} },
      { id: "issue-2", select: () => {} },
    ];

    expect(resolveNavigationOrderIds(items)).toEqual(["issue-1", "issue-2"]);
  });
});

describe("cycleActiveContentList", () => {
  test("cycles from sidebar to main and back", () => {
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
    const focusedIdRef = { current: "sidebar-item" as string | null };
    const activeRegistrationIdRef = { current: "sidebar" as string | null };
    let focusedId: string | null = "sidebar-item";

    expect(
      cycleActiveContentList(
        registrations,
        focusedIdRef,
        (id) => {
          focusedId = id;
        },
        activeRegistrationIdRef,
        "next",
      ),
    ).toBe(true);

    expect(activeRegistrationIdRef.current).toBe("main");
    expect(focusedId).toBe("main-item");

    expect(
      cycleActiveContentList(
        registrations,
        focusedIdRef,
        (id) => {
          focusedId = id;
        },
        activeRegistrationIdRef,
        "next",
      ),
    ).toBe(true);

    expect(activeRegistrationIdRef.current).toBe("sidebar");
    expect(focusedId).toBe("sidebar-item");
  });

  test("returns false when only one list is available", () => {
    const registrations = new Map<string, ContentListRegistration>([
      ["sidebar", createRegistration([{ id: "sidebar-item", select: () => {} }])],
    ]);
    const focusedIdRef = { current: null as string | null };
    const activeRegistrationIdRef = { current: null as string | null };

    expect(
      cycleActiveContentList(
        registrations,
        focusedIdRef,
        () => {},
        activeRegistrationIdRef,
        "next",
      ),
    ).toBe(false);
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
