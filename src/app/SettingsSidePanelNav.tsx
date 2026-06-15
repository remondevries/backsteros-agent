import { useState, type ReactNode } from "react";
import {
  getVisibleSettingsTabs,
  type SettingsTabId,
} from "../settings/settingsTabs";
import { useAdministratorAccess } from "../settings/useAdministratorAccess";
import { SidebarChevronIcon } from "./SidebarNavIcons";

type SettingsNavSectionId = "general" | "integration" | "extension" | "administrator";

const SETTINGS_NAV_SECTION_LABEL: Record<SettingsNavSectionId, string> = {
  general: "General",
  integration: "Integrations",
  extension: "Extensions",
  administrator: "Administrator",
};

function SettingsNavItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const className = [
    "left-side-panel-item",
    "left-side-panel-item-settings",
    active ? "left-side-panel-item-active" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={className}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
    >
      <span className="left-side-panel-item-label">{label}</span>
    </button>
  );
}

function SettingsNavSection({
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

export function SettingsSidePanelNav({
  activeTab,
  onTabChange,
  onBack,
}: {
  activeTab: SettingsTabId;
  onTabChange: (tab: SettingsTabId) => void;
  onBack?: () => void;
}) {
  const { isAdministrator } = useAdministratorAccess();
  const [expandedSections, setExpandedSections] = useState<Record<SettingsNavSectionId, boolean>>({
    general: true,
    integration: true,
    extension: true,
    administrator: true,
  });
  const visibleSettingsTabs = getVisibleSettingsTabs({ isAdministrator });
  const settingsTabsBySection: Record<SettingsNavSectionId, typeof visibleSettingsTabs> = {
    general: visibleSettingsTabs.filter((tab) => tab.group === "general"),
    integration: visibleSettingsTabs.filter((tab) => tab.group === "integration"),
    extension: visibleSettingsTabs.filter((tab) => tab.group === "extension"),
    administrator: visibleSettingsTabs.filter((tab) => tab.group === "administrator"),
  };
  const sectionOrder: SettingsNavSectionId[] = isAdministrator
    ? ["general", "integration", "extension", "administrator"]
    : ["general", "integration", "extension"];

  return (
    <nav className="left-side-panel left-side-panel-settings" aria-label="Settings">
      <div className="left-side-panel-scroll">
        <div className="left-side-panel-inner">
          <header className="left-side-panel-settings-header">
            {onBack ? (
              <button
                type="button"
                className="left-side-panel-settings-back"
                aria-label="Back to app"
                onClick={onBack}
              >
                <SidebarChevronIcon
                  className="left-side-panel-settings-back-icon"
                  pointing="left"
                />
              </button>
            ) : null}
            <h2 className="left-side-panel-settings-title">Settings</h2>
          </header>

          <div className="left-side-panel-list">
            {sectionOrder.map((sectionId) => (
              <SettingsNavSection
                key={sectionId}
                label={SETTINGS_NAV_SECTION_LABEL[sectionId]}
                expanded={expandedSections[sectionId]}
                onToggle={() => {
                  setExpandedSections((current) => ({
                    ...current,
                    [sectionId]: !current[sectionId],
                  }));
                }}
              >
                {settingsTabsBySection[sectionId].map((tab) => (
                  <SettingsNavItem
                    key={tab.id}
                    label={tab.label}
                    active={activeTab === tab.id}
                    onClick={() => onTabChange(tab.id)}
                  />
                ))}
              </SettingsNavSection>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
