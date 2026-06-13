import { useState, type ReactNode } from "react";
import { SETTINGS_TABS, type SettingsTabId } from "../settings/settingsTabs";
import {
  isSettingsTabConnected,
  tabShowsConnectionIndicator,
} from "../settings/integrationConnectionStatus";
import { SettingsConnectionDot } from "../settings/SettingsConnectionDot";
import { useIntegrationsStatus } from "../settings/useIntegrationsStatus";
import { SidebarChevronIcon } from "./SidebarNavIcons";

type SettingsNavSectionId = "general" | "integration";

const SETTINGS_NAV_SECTION_LABEL: Record<SettingsNavSectionId, string> = {
  general: "General",
  integration: "Integrations",
};

function SettingsNavItem({
  label,
  active,
  showConnectionDot,
  onClick,
}: {
  label: string;
  active: boolean;
  showConnectionDot?: boolean;
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
      {showConnectionDot ? (
        <SettingsConnectionDot className="left-side-panel-settings-dot" />
      ) : null}
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
  savedNotesPath,
}: {
  activeTab: SettingsTabId;
  onTabChange: (tab: SettingsTabId) => void;
  onBack?: () => void;
  savedNotesPath: string | null;
}) {
  const { status: integrationsStatus } = useIntegrationsStatus(true);
  const [expandedSections, setExpandedSections] = useState<Record<SettingsNavSectionId, boolean>>({
    general: true,
    integration: true,
  });
  const connectionContext = {
    integrationsStatus,
    savedNotesPath,
  };
  const settingsTabsBySection: Record<SettingsNavSectionId, typeof SETTINGS_TABS> = {
    general: SETTINGS_TABS.filter((tab) => tab.group === "general"),
    integration: SETTINGS_TABS.filter((tab) => tab.group === "integration"),
  };

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
                <SidebarChevronIcon className="left-side-panel-settings-back-icon" expanded={false} />
              </button>
            ) : null}
            <h2 className="left-side-panel-settings-title">Settings</h2>
          </header>

          <div className="left-side-panel-list">
            {(Object.keys(settingsTabsBySection) as SettingsNavSectionId[]).map((sectionId) => (
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
                {settingsTabsBySection[sectionId].map((tab) => {
                  const showConnectionDot =
                    tabShowsConnectionIndicator(tab.id) &&
                    isSettingsTabConnected(tab.id, connectionContext);

                  return (
                    <SettingsNavItem
                      key={tab.id}
                      label={tab.label}
                      active={activeTab === tab.id}
                      showConnectionDot={showConnectionDot}
                      onClick={() => onTabChange(tab.id)}
                    />
                  );
                })}
              </SettingsNavSection>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
