import { SETTINGS_TABS, type SettingsTabId } from "../settings/settingsTabs";
import {
  isSettingsTabConnected,
  tabShowsConnectionIndicator,
} from "../settings/integrationConnectionStatus";
import { SettingsConnectionDot } from "../settings/SettingsConnectionDot";
import { useIntegrationsStatus } from "../settings/useIntegrationsStatus";
import { SidebarChevronIcon } from "./SidebarNavIcons";

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
  const connectionContext = {
    integrationsStatus,
    savedNotesPath,
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
            {SETTINGS_TABS.map((tab) => {
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
          </div>
        </div>
      </div>
    </nav>
  );
}
