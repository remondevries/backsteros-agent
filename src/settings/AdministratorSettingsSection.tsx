import type { SettingsTabId } from "./settingsTabs";
import { AdministratorUiPreviewSection } from "./AdministratorUiPreviewSection";
import { AdministratorUserManagementSection } from "./AdministratorUserManagementSection";

export function AdministratorSettingsSection({ activeTab }: { activeTab: SettingsTabId }) {
  if (activeTab === "ui-preview") {
    return <AdministratorUiPreviewSection />;
  }

  if (activeTab === "user-management") {
    return <AdministratorUserManagementSection />;
  }

  return null;
}
