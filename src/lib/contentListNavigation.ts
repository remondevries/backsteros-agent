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

function pickActiveRegistration(
  registrations: Map<string, ContentListRegistration>,
  preferredListRegionRef?: { current: ContentListRegion | null },
): ContentListRegistration | null {
  const candidates = [...registrations.values()].filter(
    (registration) => registration.enabled && registration.itemsRef.current.length > 0,
  );
  if (candidates.length === 0) return null;

  const preferredRegion = preferredListRegionRef?.current ?? null;
  if (preferredRegion) {
    const preferredCandidates = candidates.filter(
      (registration) => registration.region === preferredRegion,
    );
    if (preferredCandidates.length > 0) {
      return (
        preferredCandidates.sort((left, right) => right.priority - left.priority)[0] ?? null
      );
    }
  }

  return candidates.sort((left, right) => right.priority - left.priority)[0] ?? null;
}

function resolveFocusIndex(
  items: ContentListNavItem[],
  focusedId: string | null,
  selectedId: string | null,
): number {
  if (focusedId) {
    const focusedIndex = items.findIndex((item) => item.id === focusedId);
    if (focusedIndex >= 0) return focusedIndex;
  }

  if (selectedId) {
    const selectedIndex = items.findIndex((item) => item.id === selectedId);
    if (selectedIndex >= 0) return selectedIndex;
  }

  return -1;
}

function moveFocus(
  registrations: Map<string, ContentListRegistration>,
  preferredListRegionRef: { current: ContentListRegion | null } | undefined,
  focusedIdRef: { current: string | null },
  setFocusedId: (id: string | null) => void,
  direction: "up" | "down",
): boolean {
  const registration = pickActiveRegistration(registrations, preferredListRegionRef);
  if (!registration) return false;

  const items = registration.itemsRef.current;
  const selectedId = registration.selectedIdRef.current;
  let index = resolveFocusIndex(items, focusedIdRef.current, selectedId);

  if (index < 0) {
    index = direction === "down" ? 0 : items.length - 1;
  } else {
    const delta = direction === "down" ? 1 : -1;
    index = (index + delta + items.length) % items.length;
  }

  const next = items[index]!;
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
  focusedIdRef: { current: string | null },
): boolean {
  const registration = pickActiveRegistration(registrations, preferredListRegionRef);
  if (!registration) return false;

  const items = registration.itemsRef.current;
  const focusedId = focusedIdRef.current;
  const selectedId = registration.selectedIdRef.current;
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
): boolean {
  const registration = pickActiveRegistration(registrations, preferredListRegionRef);
  if (!registration) return false;

  const items = registration.itemsRef.current;
  if (items.length === 0) return false;

  const selectedId = registration.selectedIdRef.current;
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
) {
  if (focusedIdRef.current === null) return;
  focusedIdRef.current = null;
  setFocusedId(null);
}

export function installContentListNavigationController(
  registrations: Map<string, ContentListRegistration>,
  focusedIdRef: { current: string | null },
  setFocusedId: (id: string | null) => void,
  preferredListRegionRef?: { current: ContentListRegion | null },
): () => void {
  contentListNavigationController = {
    moveFocus: (direction) =>
      moveFocus(registrations, preferredListRegionRef, focusedIdRef, setFocusedId, direction),
    activateFocused: () =>
      activateFocused(registrations, preferredListRegionRef, focusedIdRef),
    autoFocus: () =>
      autoFocusActiveContentList(
        registrations,
        focusedIdRef,
        setFocusedId,
        preferredListRegionRef,
      ),
    clearFocus: () => clearContentListKeyboardFocus(focusedIdRef, setFocusedId),
  };
  return () => {
    contentListNavigationController = null;
  };
}
