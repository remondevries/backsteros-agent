import {
  useLayoutEffect,
  createContext,
  useContext,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  installContentListNavigationController,
  getContentListNavigationController,
  resolveContentListPreferredRegion,
  CONTENT_LIST_ITEM_ATTR,
  type ContentListNavItem,
  type ContentListRegion,
} from "./contentListNavigation";

type ContentListNavigationContextValue = {
  register: (id: string, registration: RegistrationRecord) => void;
  unregister: (id: string) => void;
  keyboardFocusedId: string | null;
  keyboardNavActive: boolean;
  preferredListRegionRef: { current: ContentListRegion | null };
};

type RegistrationRecord = {
  region: ContentListRegion;
  priority: number;
  enabled: boolean;
  itemsRef: { current: ContentListNavItem[] };
  selectedIdRef: { current: string | null };
};

const ContentListNavigationContext = createContext<ContentListNavigationContextValue | null>(
  null,
);

export function ContentListNavigationProvider({ children }: { children: ReactNode }) {
  const registrationsRef = useRef(new Map<string, RegistrationRecord>());
  const focusedIdRef = useRef<string | null>(null);
  const preferredListRegionRef = useRef<ContentListRegion | null>(null);
  const activeRegistrationIdRef = useRef<string | null>(null);
  const keyboardNavActiveRef = useRef(false);
  const [keyboardFocusedId, setKeyboardFocusedId] = useState<string | null>(null);
  const [keyboardNavActive, setKeyboardNavActive] = useState(false);

  const register = useCallback((id: string, registration: RegistrationRecord) => {
    registrationsRef.current.set(id, registration);
  }, []);

  const unregister = useCallback((id: string) => {
    registrationsRef.current.delete(id);
  }, []);

  const value = useMemo<ContentListNavigationContextValue>(
    () => ({
      register,
      unregister,
      keyboardFocusedId,
      keyboardNavActive,
      preferredListRegionRef,
    }),
    [keyboardFocusedId, keyboardNavActive, register, unregister],
  );

  const setFocusedId = (id: string | null) => {
    focusedIdRef.current = id;
    setKeyboardFocusedId(id);
  };

  const setKeyboardNavActiveState = useCallback((active: boolean) => {
    keyboardNavActiveRef.current = active;
    setKeyboardNavActive(active);
  }, []);

  useEffect(() => {
    return installContentListNavigationController(
      registrationsRef.current,
      focusedIdRef,
      setFocusedId,
      preferredListRegionRef,
      activeRegistrationIdRef,
      keyboardNavActiveRef,
      setKeyboardNavActiveState,
    );
  }, [setKeyboardNavActiveState]);

  useEffect(() => {
    const root = document.documentElement;
    if (keyboardNavActive) {
      root.dataset.contentListKeyboardNav = "true";
    } else {
      delete root.dataset.contentListKeyboardNav;
    }
  }, [keyboardNavActive]);

  useEffect(() => {
    function onMouseOver(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const item = target.closest(`[${CONTENT_LIST_ITEM_ATTR}]`);
      if (!item) return;

      const related = event.relatedTarget;
      if (related instanceof Node && item.contains(related)) return;

      const itemId = item.getAttribute(CONTENT_LIST_ITEM_ATTR);
      if (!itemId) return;

      getContentListNavigationController()?.focusFromPointer(itemId);
    }

    document.addEventListener("mouseover", onMouseOver);
    return () => document.removeEventListener("mouseover", onMouseOver);
  }, []);

  return (
    <ContentListNavigationContext.Provider value={value}>
      {children}
    </ContentListNavigationContext.Provider>
  );
}

export function ContentListNavigationLayoutSync({
  activeVaultNavItem,
  hideSidebar,
  settingsOpen,
}: {
  activeVaultNavItem: string | null;
  hideSidebar: boolean;
  settingsOpen: boolean;
}) {
  const preferredListRegionRef = useContext(ContentListNavigationContext)?.preferredListRegionRef;
  const preferredRegion = resolveContentListPreferredRegion({ settingsOpen, hideSidebar });

  useLayoutEffect(() => {
    if (!preferredListRegionRef) return;
    preferredListRegionRef.current = preferredRegion;
  }, [preferredListRegionRef, preferredRegion]);

  useEffect(() => {
    const controller = getContentListNavigationController();
    controller?.clearFocus();
    controller?.autoFocus();
    const frame = window.requestAnimationFrame(() => {
      getContentListNavigationController()?.autoFocus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeVaultNavItem, hideSidebar, preferredRegion, settingsOpen]);

  return null;
}

export function useContentListKeyboardFocusedId(): string | null {
  const context = useContext(ContentListNavigationContext);
  return context?.keyboardFocusedId ?? null;
}

export function useContentListKeyboardNavActive(): boolean {
  const context = useContext(ContentListNavigationContext);
  return context?.keyboardNavActive ?? false;
}

export function useContentListItemKeyboardFocused(itemId: string): boolean {
  const keyboardFocusedId = useContentListKeyboardFocusedId();
  const keyboardNavActive = useContentListKeyboardNavActive();
  return isContentListKeyboardFocused(keyboardFocusedId, itemId, keyboardNavActive);
}

export function useContentListNavigationRegistration({
  region,
  enabled = true,
  priority,
  items,
  selectedId,
}: {
  region: ContentListRegion;
  enabled?: boolean;
  priority?: number;
  items: ContentListNavItem[];
  selectedId: string | null;
}) {
  const id = useId();
  const register = useContext(ContentListNavigationContext)?.register;
  const unregister = useContext(ContentListNavigationContext)?.unregister;
  const itemsRef = useRef(items);
  const selectedIdRef = useRef(selectedId);
  itemsRef.current = items;
  selectedIdRef.current = selectedId;

  const itemIdsKey = enabled ? items.map((item) => item.id).join("\u0000") : "";

  useEffect(() => {
    if (!register || !unregister) return undefined;
    register(id, {
      region,
      priority: priority ?? (region === "main" ? 10 : 5),
      enabled,
      itemsRef,
      selectedIdRef,
    });
    return () => {
      unregister(id);
      window.requestAnimationFrame(() => {
        getContentListNavigationController()?.autoFocus();
      });
    };
  }, [enabled, id, priority, region, register, unregister]);

  useEffect(() => {
    if (!enabled || items.length === 0) return;
    getContentListNavigationController()?.autoFocus();
  }, [enabled, itemIdsKey, items.length, selectedId]);
}

export function isContentListKeyboardFocused(
  keyboardFocusedId: string | null,
  itemId: string,
  keyboardNavActive = true,
): boolean {
  return keyboardNavActive && keyboardFocusedId === itemId;
}
