import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  IOS_BOTTOM_NAV_MORE_ITEM_IDS,
  IOS_BOTTOM_NAV_TRAY_ITEM_IDS,
  isIosBottomNavMoreItem,
} from "../lib/iosNavConfig";
import { sidebarNavItemLabel, type SidebarNavItemId } from "../lib/sidebarNavItems";
import { useIosKeyboardViewportSync, useIosKeyboardVisible } from "../hooks/useIosKeyboardViewportSync";
import { isIosDevice } from "../platform/iosStandalone";
import { useContentPanelChrome } from "./contentPanelChromeContext";
import { WorkoutRepsIcon } from "./workouts/WorkoutRepsIcon";
import { useCommandPalette } from "../command-palette/CommandPaletteContext";
import { useActiveWorkoutSession } from "./ActiveWorkoutSessionContext";
import { RefreshIcon } from "./RefreshIcon";
import { sidebarNavItemIcon } from "./sidebarNavConfig";
import { SidebarMoreIcon } from "./SidebarNavIcons";

type MobileNavTrayItem =
  | {
      id: SidebarNavItemId;
      label: string;
      icon: ReactNode;
    }
  | {
      id: "more";
      label: string;
      icon: ReactNode;
    };

const MOBILE_NAV_TRAY_ITEMS: MobileNavTrayItem[] = [
  ...IOS_BOTTOM_NAV_TRAY_ITEM_IDS.map((id) => ({
    id,
    label: sidebarNavItemLabel(id),
    icon: sidebarNavItemIcon(id),
  })),
  { id: "more", label: "More", icon: <SidebarMoreIcon /> },
];

const MORE_MENU_ITEMS = IOS_BOTTOM_NAV_MORE_ITEM_IDS.map((id) => ({
  id,
  label: sidebarNavItemLabel(id),
  icon: sidebarNavItemIcon(id),
}));

const IOS_BOTTOM_NAV_MORE_TRAY_INDEX = IOS_BOTTOM_NAV_TRAY_ITEM_IDS.length;
const IOS_MORE_MENU_GAP_PX = 12;

type MoreMenuPosition = {
  bottom: number;
  right: number;
};

function readMoreMenuPosition(anchor: HTMLElement): MoreMenuPosition {
  const rect = anchor.getBoundingClientRect();
  return {
    bottom: window.innerHeight - rect.top + IOS_MORE_MENU_GAP_PX,
    right: window.innerWidth - rect.right,
  };
}

function activeTrayIndexForNavItem(
  activeVaultNavItem: SidebarNavItemId | null,
  moreOpen: boolean,
): number {
  if (moreOpen || isIosBottomNavMoreItem(activeVaultNavItem)) {
    return IOS_BOTTOM_NAV_MORE_TRAY_INDEX;
  }
  const trayIndex = IOS_BOTTOM_NAV_TRAY_ITEM_IDS.findIndex((id) => id === activeVaultNavItem);
  return trayIndex >= 0 ? trayIndex : 0;
}

function activeMoreMenuIndexForNavItem(activeVaultNavItem: SidebarNavItemId | null): number | null {
  if (!isIosBottomNavMoreItem(activeVaultNavItem)) {
    return null;
  }
  const index = IOS_BOTTOM_NAV_MORE_ITEM_IDS.findIndex((id) => id === activeVaultNavItem);
  return index >= 0 ? index : null;
}

function IosMobileQuickActionPlusIcon() {
  return (
    <svg viewBox="0 0 16 16" width="22" height="22" aria-hidden="true">
      <path
        d="M8 3.25v9.5M3.25 8h9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IosMobileSearchActionIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M10.25 2a8.25 8.25 0 0 1 6.34 13.53l5.69 5.69a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215l-5.69-5.69A8.25 8.25 0 1 1 10.25 2ZM3.5 10.25a6.75 6.75 0 1 0 13.5 0 6.75 6.75 0 0 0-13.5 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IosMobileNavLoadingIcon() {
  return <RefreshIcon spinning />;
}

export function IosMobileBottomNav({
  activeVaultNavItem,
  onVaultNavItemChange,
}: {
  activeVaultNavItem: SidebarNavItemId | null;
  onVaultNavItemChange: (item: SidebarNavItemId) => void;
}) {
  const { iosMobileQuickActions, iosMobileSearchAction, iosMobileNavLoadingItem } =
    useContentPanelChrome();
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();
  const { isActive: activeWorkoutSession } = useActiveWorkoutSession();
  useIosKeyboardViewportSync();
  const keyboardVisible = useIosKeyboardVisible();
  const moreAnchorRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreMenuPosition, setMoreMenuPosition] = useState<MoreMenuPosition | null>(null);
  const quickActions = iosMobileQuickActions ?? [];
  const showActionStack = quickActions.length > 0 || iosMobileSearchAction !== null;
  const activeTrayIndex = activeTrayIndexForNavItem(activeVaultNavItem, moreOpen);
  const activeMoreMenuIndex = activeMoreMenuIndexForNavItem(activeVaultNavItem);

  useEffect(() => {
    if (!moreOpen) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (moreAnchorRef.current?.contains(target)) return;
      if (moreMenuRef.current?.contains(target)) return;
      setMoreOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMoreOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [moreOpen]);

  useLayoutEffect(() => {
    if (!moreOpen) {
      setMoreMenuPosition(null);
      return;
    }

    const anchor = moreAnchorRef.current;
    if (!anchor) return;

    const updatePosition = () => {
      setMoreMenuPosition(readMoreMenuPosition(anchor));
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
    };
  }, [moreOpen, showActionStack]);

  useEffect(() => {
    if (keyboardVisible) {
      setMoreOpen(false);
    }
  }, [keyboardVisible]);

  if (!isIosDevice()) {
    return null;
  }

  return (
    <nav
      className="ios-mobile-bottom-nav"
      aria-label="Mobile navigation"
      aria-hidden={keyboardVisible}
    >
      <div className="ios-mobile-bottom-nav-cluster">
        <div
          className="ios-mobile-bottom-nav-bar"
          role="toolbar"
          aria-label="Primary"
          data-active-index={activeTrayIndex}
        >
          <span className="ios-mobile-bottom-nav-indicator" aria-hidden="true" />
          {MOBILE_NAV_TRAY_ITEMS.map((item) => {
            if (item.id === "more") {
              const isMoreSectionActive = isIosBottomNavMoreItem(activeVaultNavItem);
              const moreNavLoading =
                iosMobileNavLoadingItem !== null &&
                isIosBottomNavMoreItem(iosMobileNavLoadingItem);
              return (
                <div
                  key={item.id}
                  className="ios-mobile-bottom-nav-more-anchor"
                  ref={moreAnchorRef}
                >
                  <button
                    type="button"
                    className={[
                      "ios-mobile-bottom-nav-item",
                      moreOpen || isMoreSectionActive
                        ? "ios-mobile-bottom-nav-item--active"
                        : null,
                      moreOpen ? "ios-mobile-bottom-nav-item--open" : null,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-label={item.label}
                    aria-haspopup="menu"
                    aria-expanded={moreOpen}
                    aria-busy={moreNavLoading}
                    onClick={() => setMoreOpen((current) => !current)}
                  >
                    <span className="ios-mobile-bottom-nav-item-icon" aria-hidden="true">
                      {moreNavLoading ? <IosMobileNavLoadingIcon /> : item.icon}
                    </span>
                  </button>
                </div>
              );
            }

            const isActive = activeVaultNavItem === item.id;
            const trayNavLoading = iosMobileNavLoadingItem === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={[
                  "ios-mobile-bottom-nav-item",
                  isActive ? "ios-mobile-bottom-nav-item--active" : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                aria-busy={trayNavLoading}
                onClick={() => {
                  setMoreOpen(false);
                  onVaultNavItemChange(item.id);
                }}
              >
                <span className="ios-mobile-bottom-nav-item-icon" aria-hidden="true">
                  {trayNavLoading ? <IosMobileNavLoadingIcon /> : item.icon}
                </span>
              </button>
            );
          })}
        </div>
        {showActionStack ? (
          <div className="ios-mobile-bottom-nav-actions" aria-label="Quick actions">
            {quickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="ios-mobile-bottom-nav-action ios-mobile-bottom-nav-action--quick"
                aria-label={action.label}
                title={action.label}
                disabled={action.disabled}
                onClick={action.onClick}
              >
                <span className="ios-mobile-bottom-nav-action-icon" aria-hidden="true">
                  <IosMobileQuickActionPlusIcon />
                </span>
              </button>
            ))}
            {iosMobileSearchAction ? (
              <button
                type="button"
                className="ios-mobile-bottom-nav-action ios-mobile-bottom-nav-action--anchor"
                aria-label={
                  commandPaletteOpen ? "Close command palette" : iosMobileSearchAction.label
                }
                title={commandPaletteOpen ? "Close command palette" : iosMobileSearchAction.label}
                disabled={iosMobileSearchAction.disabled}
                onClick={() => {
                  if (commandPaletteOpen) {
                    setCommandPaletteOpen(false);
                    return;
                  }
                  iosMobileSearchAction.onActivate();
                }}
              >
                <span className="ios-mobile-bottom-nav-action-icon" aria-hidden="true">
                  {commandPaletteOpen ? <WorkoutRepsIcon /> : <IosMobileSearchActionIcon />}
                </span>
                {activeWorkoutSession && !commandPaletteOpen ? (
                  <span
                    className="ios-mobile-bottom-nav-action-active-dot"
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {moreOpen && moreMenuPosition ? (
        <div
          ref={moreMenuRef}
          className="ios-mobile-bottom-nav-more-menu"
          role="menu"
          aria-label="More destinations"
          data-active-index={
            activeMoreMenuIndex === null ? undefined : String(activeMoreMenuIndex)
          }
          style={{
            bottom: `${moreMenuPosition.bottom}px`,
            right: `${moreMenuPosition.right}px`,
          }}
        >
          <span className="ios-mobile-bottom-nav-more-indicator" aria-hidden="true" />
          {MORE_MENU_ITEMS.map((menuItem) => {
            const isActive = activeVaultNavItem === menuItem.id;
            const menuNavLoading = iosMobileNavLoadingItem === menuItem.id;
            return (
              <button
                key={menuItem.id}
                type="button"
                className={[
                  "ios-mobile-bottom-nav-more-item",
                  isActive ? "ios-mobile-bottom-nav-more-item--active" : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
                role="menuitem"
                aria-busy={menuNavLoading}
                onClick={() => {
                  const isSwitch = activeVaultNavItem !== menuItem.id;
                  onVaultNavItemChange(menuItem.id);
                  if (isSwitch) {
                    window.setTimeout(() => setMoreOpen(false), 180);
                    return;
                  }
                  setMoreOpen(false);
                }}
              >
                <span className="ios-mobile-bottom-nav-more-item-icon" aria-hidden="true">
                  {menuNavLoading ? <IosMobileNavLoadingIcon /> : menuItem.icon}
                </span>
                <span className="ios-mobile-bottom-nav-more-item-label">{menuItem.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </nav>
  );
}
