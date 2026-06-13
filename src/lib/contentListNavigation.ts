export const CONTENT_LIST_ITEM_ATTR = "data-content-list-item";

export type ContentListNavItem = {
  id: string;
  select: () => void;
};

export type ContentListRegion = "sidebar" | "main";

export type ContentListRegistration = {
  region: ContentListRegion;
  priority: number;
  enabled: boolean;
  itemsRef: { current: ContentListNavItem[] };
  selectedIdRef: { current: string | null };
};

export type ContentListNavigationController = {
  moveFocus: (direction: "up" | "down") => boolean;
  activateFocused: () => boolean;
  autoFocus: () => boolean;
  clearFocus: () => void;
  cycleList: (direction: "next" | "prev") => boolean;
  getFocusedId: () => string | null;
};

let contentListNavigationController: ContentListNavigationController | null = null;

export function getContentListNavigationController(): ContentListNavigationController | null {
  return contentListNavigationController;
}

export function scrollContentListItemIntoView(itemId: string) {
  if (typeof document === "undefined") return;
  const element = document.querySelector(`[${CONTENT_LIST_ITEM_ATTR}="${CSS.escape(itemId)}"]`);
  element?.scrollIntoView({ block: "nearest" });
}

export function contentListItemDataAttributes(itemId: string) {
  return { [CONTENT_LIST_ITEM_ATTR]: itemId };
}

export function contentListGroupHeaderId(prefix: string, groupKey: string): string {
  return `${prefix}:${groupKey}`;
}

export function resolveContentListPreferredRegion({
  settingsOpen,
  hideSidebar,
}: {
  settingsOpen: boolean;
  hideSidebar: boolean;
}): ContentListRegion | null {
  if (settingsOpen) return null;
  return hideSidebar ? "main" : "sidebar";
}

function listEligibleRegistrations(
  registrations: Map<string, ContentListRegistration>,
): Array<[string, ContentListRegistration]> {
  return [...registrations.entries()]
    .filter(([, registration]) => registration.enabled && registration.itemsRef.current.length > 0)
    .sort(([, left], [, right]) => {
      if (left.region !== right.region) {
        return left.region === "sidebar" ? -1 : 1;
      }
      return right.priority - left.priority;
    });
}

type ActiveRegistration = {
  id: string;
  registration: ContentListRegistration;
};

function resolveActiveRegistration(
  registrations: Map<string, ContentListRegistration>,
  preferredListRegionRef: { current: ContentListRegion | null } | undefined,
  activeRegistrationIdRef: { current: string | null } | undefined,
): ActiveRegistration | null {
  const eligible = listEligibleRegistrations(registrations);
  if (eligible.length === 0) return null;

  const activeId = activeRegistrationIdRef?.current ?? null;
  if (activeId) {
    const registration = registrations.get(activeId);
    if (registration?.enabled && registration.itemsRef.current.length > 0) {
      return { id: activeId, registration };
    }
  }

  const preferredRegion = preferredListRegionRef?.current ?? null;
  if (preferredRegion) {
    const preferredCandidates = eligible.filter(
      ([, registration]) => registration.region === preferredRegion,
    );
    if (preferredCandidates.length > 0) {
      const [id, registration] = preferredCandidates[0]!;
      return { id, registration };
    }
  }

  const [id, registration] = eligible[0]!;
  return { id, registration };
}

function setActiveRegistrationFocus(
  active: ActiveRegistration,
  activeRegistrationIdRef: { current: string | null } | undefined,
  focusedIdRef: { current: string | null },
  setFocusedId: (id: string | null) => void,
) {
  if (activeRegistrationIdRef) {
    activeRegistrationIdRef.current = active.id;
  }

  const items = active.registration.itemsRef.current;
  const selectedId = active.registration.selectedIdRef.current;
  const targetId =
    selectedId && items.some((item) => item.id === selectedId) ? selectedId : items[0]!.id;

  if (focusedIdRef.current !== targetId) {
    focusedIdRef.current = targetId;
    setFocusedId(targetId);
    scrollContentListItemIntoView(targetId);
  }
}

export function resolveNavigationOrderIds(items: ContentListNavItem[]): string[] {
  const ids = items.map((item) => item.id);
  if (typeof document === "undefined" || ids.length === 0) return ids;

  const elements = ids.flatMap((id) => {
    const matches = document.querySelectorAll(
      `[${CONTENT_LIST_ITEM_ATTR}="${CSS.escape(id)}"]`,
    );
    return [...matches];
  });

  if (elements.length === 0) return ids;

  const sorted = elements.sort((left, right) => {
    const leftRect = left.getBoundingClientRect();
    const rightRect = right.getBoundingClientRect();
    const topDiff = leftRect.top - rightRect.top;
    if (Math.abs(topDiff) > 1) return topDiff;
    return leftRect.left - rightRect.left;
  });

  const seen = new Set<string>();
  const domOrder: string[] = [];
  for (const element of sorted) {
    const id = element.getAttribute(CONTENT_LIST_ITEM_ATTR);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    domOrder.push(id);
  }

  const remaining = ids.filter((id) => !seen.has(id));
  return [...domOrder, ...remaining];
}

function itemById(items: ContentListNavItem[], id: string): ContentListNavItem | null {
  return items.find((item) => item.id === id) ?? null;
}

function moveFocus(
  registrations: Map<string, ContentListRegistration>,
  preferredListRegionRef: { current: ContentListRegion | null } | undefined,
  activeRegistrationIdRef: { current: string | null } | undefined,
  focusedIdRef: { current: string | null },
  setFocusedId: (id: string | null) => void,
  direction: "up" | "down",
): boolean {
  const active = resolveActiveRegistration(
    registrations,
    preferredListRegionRef,
    activeRegistrationIdRef,
  );
  if (!active) return false;

  if (activeRegistrationIdRef) {
    activeRegistrationIdRef.current = active.id;
  }

  const items = active.registration.itemsRef.current;
  const selectedId = active.registration.selectedIdRef.current;
  const orderIds = resolveNavigationOrderIds(items);
  const currentId =
    focusedIdRef.current ??
    (selectedId && orderIds.includes(selectedId) ? selectedId : null);

  let index =
    currentId != null ? orderIds.indexOf(currentId) : -1;

  if (index < 0) {
    index = direction === "down" ? 0 : orderIds.length - 1;
  } else if (direction === "down") {
    if (index >= orderIds.length - 1) return true;
    index += 1;
  } else if (index <= 0) {
    return true;
  } else {
    index -= 1;
  }

  const nextId = orderIds[index];
  if (!nextId) return false;

  const next = itemById(items, nextId);
  if (!next) return false;

  if (focusedIdRef.current !== next.id) {
    focusedIdRef.current = next.id;
    setFocusedId(next.id);
    scrollContentListItemIntoView(next.id);
  }

  return true;
}

function activateFocused(
  registrations: Map<string, ContentListRegistration>,
  preferredListRegionRef: { current: ContentListRegion | null } | undefined,
  activeRegistrationIdRef: { current: string | null } | undefined,
  focusedIdRef: { current: string | null },
): boolean {
  const active = resolveActiveRegistration(
    registrations,
    preferredListRegionRef,
    activeRegistrationIdRef,
  );
  if (!active) return false;

  if (activeRegistrationIdRef) {
    activeRegistrationIdRef.current = active.id;
  }

  const items = active.registration.itemsRef.current;
  const focusedId = focusedIdRef.current;
  const selectedId = active.registration.selectedIdRef.current;
  const targetId = focusedId ?? selectedId;
  if (!targetId) return false;

  const item = items.find((entry) => entry.id === targetId);
  if (!item) return false;

  item.select();
  return true;
}

export function autoFocusActiveContentList(
  registrations: Map<string, ContentListRegistration>,
  focusedIdRef: { current: string | null },
  setFocusedId: (id: string | null) => void,
  preferredListRegionRef?: { current: ContentListRegion | null },
  activeRegistrationIdRef?: { current: string | null },
): boolean {
  const active = resolveActiveRegistration(
    registrations,
    preferredListRegionRef,
    activeRegistrationIdRef,
  );
  if (!active) return false;

  if (activeRegistrationIdRef) {
    activeRegistrationIdRef.current = active.id;
  }

  const items = active.registration.itemsRef.current;
  if (items.length === 0) return false;

  const selectedId = active.registration.selectedIdRef.current;
  const currentFocus = focusedIdRef.current;

  if (currentFocus && items.some((item) => item.id === currentFocus)) {
    return true;
  }

  const targetId =
    selectedId && items.some((item) => item.id === selectedId)
      ? selectedId
      : items[0]!.id;

  if (focusedIdRef.current !== targetId) {
    focusedIdRef.current = targetId;
    setFocusedId(targetId);
    scrollContentListItemIntoView(targetId);
  }

  return true;
}

export function clearContentListKeyboardFocus(
  focusedIdRef: { current: string | null },
  setFocusedId: (id: string | null) => void,
  activeRegistrationIdRef?: { current: string | null },
) {
  if (activeRegistrationIdRef) {
    activeRegistrationIdRef.current = null;
  }
  if (focusedIdRef.current === null) return;
  focusedIdRef.current = null;
  setFocusedId(null);
}

export function cycleActiveContentList(
  registrations: Map<string, ContentListRegistration>,
  focusedIdRef: { current: string | null },
  setFocusedId: (id: string | null) => void,
  activeRegistrationIdRef: { current: string | null },
  direction: "next" | "prev",
): boolean {
  const eligible = listEligibleRegistrations(registrations);
  if (eligible.length <= 1) return false;

  const currentId =
    activeRegistrationIdRef.current ??
    resolveActiveRegistration(registrations, undefined, activeRegistrationIdRef)?.id ??
    eligible[0]![0];
  const currentIndex = eligible.findIndex(([id]) => id === currentId);
  const startIndex = currentIndex >= 0 ? currentIndex : 0;
  const delta = direction === "next" ? 1 : -1;
  const nextIndex = (startIndex + delta + eligible.length) % eligible.length;
  const [nextId, nextRegistration] = eligible[nextIndex]!;

  activeRegistrationIdRef.current = nextId;
  setActiveRegistrationFocus(
    { id: nextId, registration: nextRegistration },
    activeRegistrationIdRef,
    focusedIdRef,
    setFocusedId,
  );
  return true;
}

export function countEligibleContentLists(
  registrations: Map<string, ContentListRegistration>,
): number {
  return listEligibleRegistrations(registrations).length;
}

export function installContentListNavigationController(
  registrations: Map<string, ContentListRegistration>,
  focusedIdRef: { current: string | null },
  setFocusedId: (id: string | null) => void,
  preferredListRegionRef?: { current: ContentListRegion | null },
  activeRegistrationIdRef?: { current: string | null },
): () => void {
  contentListNavigationController = {
    moveFocus: (direction) =>
      moveFocus(
        registrations,
        preferredListRegionRef,
        activeRegistrationIdRef,
        focusedIdRef,
        setFocusedId,
        direction,
      ),
    activateFocused: () =>
      activateFocused(registrations, preferredListRegionRef, activeRegistrationIdRef, focusedIdRef),
    autoFocus: () =>
      autoFocusActiveContentList(
        registrations,
        focusedIdRef,
        setFocusedId,
        preferredListRegionRef,
        activeRegistrationIdRef,
      ),
    clearFocus: () =>
      clearContentListKeyboardFocus(focusedIdRef, setFocusedId, activeRegistrationIdRef),
    cycleList: (direction) => {
      if (!activeRegistrationIdRef) return false;
      return cycleActiveContentList(
        registrations,
        focusedIdRef,
        setFocusedId,
        activeRegistrationIdRef,
        direction,
      );
    },
    getFocusedId: () => focusedIdRef.current,
  };
  return () => {
    contentListNavigationController = null;
  };
}
