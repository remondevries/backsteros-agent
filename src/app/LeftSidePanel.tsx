import { useState, type ReactNode } from "react";
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
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  const className = ["left-side-panel-item", active ? "left-side-panel-item-active" : null]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={className}
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
  onVaultNavItemChange: (item: SidebarNavItemId) => void;
}) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    workspace: true,
    people: true,
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  };

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
          <header className="left-side-panel-profile">
            <span className="left-side-panel-profile-logo">
              <BacksterIcon size={16} />
            </span>
            <span className="left-side-panel-profile-name">Backster OS</span>
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

      <footer className="left-side-panel-systems" aria-label="Systems">
        <div className="left-side-panel-section-toggle left-side-panel-systems-heading" aria-hidden>
          <span className="left-side-panel-section-label">Systems</span>
        </div>
        <div className="left-side-panel-systems-list">
          {APP_VIEWS.map((view) => (
            <LeftSidePanelNavItem
              key={view.id}
              label={view.label}
              icon={view.icon}
              active={activeView === view.id}
              onClick={() => onChange(view.id)}
            />
          ))}
          <LeftSidePanelNavItem
            label="Settings"
            icon={<SidebarSettingsIcon />}
            active={false}
            onClick={onOpenSettings}
          />
        </div>
      </footer>
    </nav>
  );
}
