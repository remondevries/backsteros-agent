import { useEffect, useRef, useState, type ReactNode } from "react";
import { APP_VIEWS, type AppView } from "./appViews";
import {
  SIDEBAR_PRIMARY_ITEMS,
  SIDEBAR_SECTIONS,
  type SidebarNavItemId,
} from "./sidebarNavConfig";
import { BacksterIcon } from "../chat/BacksterIcon";
import { SidebarChevronIcon, SidebarSettingsIcon } from "./SidebarNavIcons";
import { SettingsSidePanelNav } from "./SettingsSidePanelNav";
import type { SettingsTabId } from "../settings/settingsTabs";

function LeftSidePanelNavItem({
  label,
  icon,
  active,
  className,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  className?: string;
  onClick: () => void;
}) {
  const itemClassName = ["left-side-panel-item", active ? "left-side-panel-item-active" : null, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={itemClassName}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
    >
      <span className="left-side-panel-item-icon">{icon}</span>
      <span className="left-side-panel-item-label">{label}</span>
    </button>
  );
}

function LeftSidePanelNavSection({
  label,
  expanded,
  onToggle,
  children,
}: {
  label: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="left-side-panel-section">
      <button
        type="button"
        className="left-side-panel-section-toggle"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span className="left-side-panel-section-label">{label}</span>
        <SidebarChevronIcon className="left-side-panel-section-chevron" expanded={expanded} />
      </button>
      {expanded ? <div className="left-side-panel-section-items">{children}</div> : null}
    </div>
  );
}

export function LeftSidePanel({
  activeView,
  onChange,
  settingsOpen,
  activeSettingsTab,
  onSettingsTabChange,
  onOpenSettings,
  onExitSettings,
  savedNotesPath,
  activeVaultNavItem,
  onVaultNavItemChange,
}: {
  activeView: AppView;
  onChange: (view: AppView) => void;
  settingsOpen: boolean;
  activeSettingsTab: SettingsTabId;
  onSettingsTabChange: (tab: SettingsTabId) => void;
  onOpenSettings: () => void;
  onExitSettings?: () => void;
  savedNotesPath: string | null;
  activeVaultNavItem: SidebarNavItemId | null;
  onVaultNavItemChange: (item: SidebarNavItemId | null) => void;
}) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    workspace: true,
    people: true,
  });
  const [systemsMenuOpen, setSystemsMenuOpen] = useState(false);
  const systemsMenuRef = useRef<HTMLDivElement | null>(null);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  };

  useEffect(() => {
    if (!systemsMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!systemsMenuRef.current || (target && systemsMenuRef.current.contains(target))) {
        return;
      }
      setSystemsMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSystemsMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [systemsMenuOpen]);

  if (settingsOpen) {
    return (
      <SettingsSidePanelNav
        activeTab={activeSettingsTab}
        onTabChange={onSettingsTabChange}
        onBack={onExitSettings}
        savedNotesPath={savedNotesPath}
      />
    );
  }

  return (
    <nav className="left-side-panel" aria-label="Main navigation">
      <div className="left-side-panel-scroll">
        <div className="left-side-panel-inner">
          <header className="left-side-panel-profile" ref={systemsMenuRef}>
            <button
              type="button"
              className={[
                "left-side-panel-profile-trigger",
                systemsMenuOpen ? "left-side-panel-profile-trigger-open" : null,
              ]
                .filter(Boolean)
                .join(" ")}
              aria-haspopup="menu"
              aria-expanded={systemsMenuOpen}
              aria-label="Open systems menu"
              onClick={() => setSystemsMenuOpen((current) => !current)}
            >
              <span className="left-side-panel-profile-logo">
                <BacksterIcon size={16} />
              </span>
              <span className="left-side-panel-profile-name">Backster OS</span>
              <svg
                className={[
                  "left-side-panel-profile-trigger-chevron",
                  systemsMenuOpen ? "left-side-panel-profile-trigger-chevron-open" : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
                width="12"
                height="12"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <polyline
                  points="6 9 12 15 18 9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {systemsMenuOpen ? (
              <div className="left-side-panel-profile-menu" role="menu" aria-label="Systems menu">
                <LeftSidePanelNavItem
                  label="Settings"
                  icon={<SidebarSettingsIcon />}
                  className="left-side-panel-profile-menu-item"
                  onClick={() => {
                    setSystemsMenuOpen(false);
                    onOpenSettings();
                  }}
                />
                <div className="left-side-panel-profile-menu-divider" />
                <div className="left-side-panel-profile-menu-section">
                  {APP_VIEWS.map((view) => (
                    <LeftSidePanelNavItem
                      key={view.id}
                      label={view.label}
                      icon={view.icon}
                      active={activeView === view.id}
                      className="left-side-panel-profile-menu-item"
                      onClick={() => {
                        onVaultNavItemChange(null);
                        onChange(view.id);
                        setSystemsMenuOpen(false);
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </header>

          <div className="left-side-panel-list">
            {SIDEBAR_PRIMARY_ITEMS.map((item) => (
              <LeftSidePanelNavItem
                key={item.id}
                label={item.label}
                icon={item.icon}
                active={activeVaultNavItem === item.id}
                onClick={() => onVaultNavItemChange(item.id)}
              />
            ))}

            {SIDEBAR_SECTIONS.map((section) => (
              <LeftSidePanelNavSection
                key={section.id}
                label={section.label}
                expanded={expandedSections[section.id] ?? true}
                onToggle={() => toggleSection(section.id)}
              >
                {section.items.map((item) => (
                  <LeftSidePanelNavItem
                    key={item.id}
                    label={item.label}
                    icon={item.icon}
                    active={activeVaultNavItem === item.id}
                    onClick={() => onVaultNavItemChange(item.id)}
                  />
                ))}
              </LeftSidePanelNavSection>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
