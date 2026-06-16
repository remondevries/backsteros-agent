import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  IOS_BOTTOM_NAV_MORE_ITEM_IDS,
  IOS_BOTTOM_NAV_TRAY_ITEM_IDS,
  isIosBottomNavMoreItem,
} from "../lib/iosNavConfig";
import { sidebarNavItemLabel, type SidebarNavItemId } from "../lib/sidebarNavItems";
import { useIosKeyboardViewportSync } from "../hooks/useIosKeyboardViewportSync";
import { isIosDevice } from "../platform/iosStandalone";
import { useContentPanelChrome } from "./contentPanelChromeContext";
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

export function IosMobileBottomNav({
  activeVaultNavItem,
  onVaultNavItemChange,
}: {
  activeVaultNavItem: SidebarNavItemId | null;
  onVaultNavItemChange: (item: SidebarNavItemId) => void;
}) {
  const { iosMobileQuickActions, iosMobileSearchAction } = useContentPanelChrome();
  useIosKeyboardViewportSync();
  const moreAnchorRef = useRef<HTMLDivElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const quickActions = iosMobileQuickActions ?? [];
  const showActionStack = quickActions.length > 0 || iosMobileSearchAction !== null;
  const activeTrayIndex = activeTrayIndexForNavItem(activeVaultNavItem, moreOpen);

  useEffect(() => {
    if (!moreOpen) return;

    function onPointerDown(event: PointerEvent) {
      if (moreAnchorRef.current?.contains(event.target as Node)) return;
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

  if (!isIosDevice()) {
    return null;
  }

  return (
    <nav className="ios-mobile-bottom-nav" aria-label="Mobile navigation">
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
                    onClick={() => setMoreOpen((current) => !current)}
                  >
                    <span className="ios-mobile-bottom-nav-item-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                  </button>
                  {moreOpen ? (
                    <div
                      className="ios-mobile-bottom-nav-more-menu"
                      role="menu"
                      aria-label="More destinations"
                    >
                      {MORE_MENU_ITEMS.map((menuItem) => {
                        const isActive = activeVaultNavItem === menuItem.id;
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
                            onClick={() => {
                              setMoreOpen(false);
                              onVaultNavItemChange(menuItem.id);
                            }}
                          >
                            <span
                              className="ios-mobile-bottom-nav-more-item-icon"
                              aria-hidden="true"
                            >
                              {menuItem.icon}
                            </span>
                            <span className="ios-mobile-bottom-nav-more-item-label">
                              {menuItem.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            }

            const isActive = activeVaultNavItem === item.id;
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
                onClick={() => {
                  setMoreOpen(false);
                  onVaultNavItemChange(item.id);
                }}
              >
                <span className="ios-mobile-bottom-nav-item-icon" aria-hidden="true">
                  {item.icon}
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
                aria-label={iosMobileSearchAction.label}
                title={iosMobileSearchAction.label}
                disabled={iosMobileSearchAction.disabled}
                onClick={iosMobileSearchAction.onActivate}
              >
                <span className="ios-mobile-bottom-nav-action-icon" aria-hidden="true">
                  <IosMobileSearchActionIcon />
                </span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
