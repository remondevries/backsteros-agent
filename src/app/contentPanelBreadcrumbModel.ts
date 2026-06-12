import { APP_VIEWS, type AppView } from "./appViews";
import { sidebarNavItemLabel, type SidebarNavItemId } from "../lib/sidebarNavItems";
import { SETTINGS_TABS, type SettingsTabId } from "../settings/settingsTabs";
import {
  mergeContentPanelBreadcrumbs,
  type ContentPanelBreadcrumbSegment,
} from "./contentPanelNavigation";

export function buildContentPanelBreadcrumbSegments(options: {
  settingsOpen: boolean;
  activeSettingsTab: SettingsTabId;
  activeVaultNavItem: SidebarNavItemId | null;
  activeView: AppView;
  activeSessionTitle?: string | null;
  sidebarSegments: ContentPanelBreadcrumbSegment[];
}): ContentPanelBreadcrumbSegment[] {
  const {
    settingsOpen,
    activeSettingsTab,
    activeVaultNavItem,
    activeView,
    activeSessionTitle,
    sidebarSegments,
  } = options;

  if (settingsOpen) {
    const settingsTab = SETTINGS_TABS.find((tab) => tab.id === activeSettingsTab);
    return mergeContentPanelBreadcrumbs(
      [{ id: "settings", label: "Settings" }],
      settingsTab ? [{ id: `settings-${settingsTab.id}`, label: settingsTab.label }] : [],
    );
  }

  const rootSegments: ContentPanelBreadcrumbSegment[] = activeVaultNavItem
    ? [{ id: `nav-${activeVaultNavItem}`, label: sidebarNavItemLabel(activeVaultNavItem) }]
    : [{ id: "explorer", label: "Explorer" }];

  const viewDefinition = APP_VIEWS.find((view) => view.id === activeView);
  const contentSegments: ContentPanelBreadcrumbSegment[] = [];

  if (viewDefinition && (activeView === "chat" || activeView === "lookup")) {
    contentSegments.push({ id: `view-${activeView}`, label: viewDefinition.label });
    const trimmedTitle = activeSessionTitle?.trim();
    if (trimmedTitle) {
      contentSegments.push({
        id: `session-${activeView}-${trimmedTitle}`,
        label: trimmedTitle,
      });
    }
  } else if (viewDefinition && !activeVaultNavItem) {
    contentSegments.push({ id: `view-${activeView}`, label: viewDefinition.label });
  }

  return mergeContentPanelBreadcrumbs(rootSegments, sidebarSegments, contentSegments);
}
