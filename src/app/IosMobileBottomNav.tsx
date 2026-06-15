import { useEffect, useRef, useState, type ReactNode } from "react";
import { sidebarNavItemLabel, type SidebarNavItemId } from "../lib/sidebarNavItems";
import { isIosDevice } from "../platform/iosStandalone";
import { useContentPanelChrome } from "./contentPanelChromeContext";
import {
  SidebarContactsIcon,
  SidebarDailyIcon,
  SidebarInboxIcon,
  SidebarLettersIcon,
  SidebarMeetingsIcon,
  SidebarMoreIcon,
  SidebarOrganizationsIcon,
  SidebarProjectsIcon,
  SidebarWorkoutsIcon,
} from "./SidebarNavIcons";

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

type MoreMenuItem = {
  id: SidebarNavItemId;
  label: string;
  icon: ReactNode;
};

const MOBILE_NAV_TRAY_ITEMS: MobileNavTrayItem[] = [
  { id: "daily", label: sidebarNavItemLabel("daily"), icon: <SidebarDailyIcon /> },
  { id: "meetings", label: sidebarNavItemLabel("meetings"), icon: <SidebarMeetingsIcon /> },
  { id: "projects", label: sidebarNavItemLabel("projects"), icon: <SidebarProjectsIcon /> },
  { id: "letters", label: sidebarNavItemLabel("letters"), icon: <SidebarLettersIcon /> },
  { id: "more", label: "More", icon: <SidebarMoreIcon /> },
];

const MORE_MENU_ITEMS: MoreMenuItem[] = [
  { id: "inbox", label: sidebarNavItemLabel("inbox"), icon: <SidebarInboxIcon /> },
  { id: "workouts", label: sidebarNavItemLabel("workouts"), icon: <SidebarWorkoutsIcon /> },
  {
    id: "organizations",
    label: sidebarNavItemLabel("organizations"),
    icon: <SidebarOrganizationsIcon />,
  },
  { id: "contacts", label: sidebarNavItemLabel("contacts"), icon: <SidebarContactsIcon /> },
];

const MORE_MENU_ITEM_IDS = MORE_MENU_ITEMS.map((item) => item.id);

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

export function IosMobileBottomNav({
  activeVaultNavItem,
  onVaultNavItemChange,
}: {
  activeVaultNavItem: SidebarNavItemId | null;
  onVaultNavItemChange: (item: SidebarNavItemId) => void;
}) {
  const { iosMobileQuickActions } = useContentPanelChrome();
  const moreAnchorRef = useRef<HTMLDivElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const quickActions = iosMobileQuickActions ?? [];

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
        <div className="ios-mobile-bottom-nav-bar" role="toolbar" aria-label="Primary">
          {MOBILE_NAV_TRAY_ITEMS.map((item) => {
            if (item.id === "more") {
              const isMoreSectionActive =
                activeVaultNavItem !== null && MORE_MENU_ITEM_IDS.includes(activeVaultNavItem);
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
          <button
            type="button"
            className={[
              "ios-mobile-bottom-nav-action",
              "ios-mobile-bottom-nav-action--anchor",
              quickActions.length === 0 ? "ios-mobile-bottom-nav-action--placeholder" : null,
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label="Quick action menu"
            aria-disabled={quickActions.length === 0 ? true : undefined}
            tabIndex={quickActions.length === 0 ? -1 : undefined}
          >
            <span className="ios-mobile-bottom-nav-action-icon" aria-hidden="true">
              <SidebarMoreIcon />
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
