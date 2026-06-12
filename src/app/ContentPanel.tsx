import type { ReactNode } from "react";
import { useMemo } from "react";
import { ContentPanelBreadcrumb } from "./ContentPanelBreadcrumb";
import { ContentPanelSidebar } from "./ContentPanelSidebar";
import { ResizablePanel } from "./ResizablePanel";
import type { AppView } from "./appViews";
import { buildContentPanelBreadcrumbSegments } from "./contentPanelBreadcrumbModel";
import {
  ContentPanelNavigationProvider,
  useContentPanelNavigation,
} from "./contentPanelNavigation";
import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import type { SettingsTabId } from "../settings/settingsTabs";

const CONTENT_PANEL_SIDEBAR_WIDTH_KEY = "backsteros.layout.contentPanelWidth";

function ContentPanelFrame({
  sidebarOpen,
  hideSidebar = false,
  activeVaultNavItem,
  vaultExplorerEnabled,
  breadcrumbSegments,
  children,
}: {
  sidebarOpen: boolean;
  hideSidebar?: boolean;
  activeVaultNavItem: SidebarNavItemId | null;
  vaultExplorerEnabled: boolean;
  breadcrumbSegments: ReturnType<typeof buildContentPanelBreadcrumbSegments>;
  children: ReactNode;
}) {
  return (
    <div className="content-panel">
      <header className="content-panel-breadcrumb-bar">
        <ContentPanelBreadcrumb segments={breadcrumbSegments} />
      </header>
      <div className="content-panel-main">
        {!hideSidebar ? (
          <ResizablePanel
            side="left"
            className="app-resizable-panel-inset"
            storageKey={CONTENT_PANEL_SIDEBAR_WIDTH_KEY}
            defaultWidth={240}
            minWidth={180}
            maxWidth={400}
            ariaLabel="Content panel sidebar"
            collapsed={!sidebarOpen}
          >
            <ContentPanelSidebar
              activeVaultNavItem={activeVaultNavItem}
              vaultExplorerEnabled={vaultExplorerEnabled}
            />
          </ResizablePanel>
        ) : null}
        <div className="content-panel-content">{children}</div>
      </div>
    </div>
  );
}

function ContentPanelWithBreadcrumbs({
  sidebarOpen,
  hideSidebar = false,
  activeVaultNavItem,
  vaultExplorerEnabled,
  settingsOpen,
  activeSettingsTab,
  activeView,
  activeSessionTitle,
  children,
}: {
  sidebarOpen: boolean;
  hideSidebar?: boolean;
  activeVaultNavItem: SidebarNavItemId | null;
  vaultExplorerEnabled: boolean;
  settingsOpen: boolean;
  activeSettingsTab: SettingsTabId;
  activeView: AppView;
  activeSessionTitle?: string | null;
  children: ReactNode;
}) {
  const { sidebarSegments, linearSelection } = useContentPanelNavigation();
  const breadcrumbSegments = useMemo(
    () =>
      buildContentPanelBreadcrumbSegments({
        settingsOpen,
        activeSettingsTab,
        activeVaultNavItem,
        activeView,
        activeSessionTitle,
        sidebarSegments,
        linearSelection,
      }),
    [
      activeSessionTitle,
      activeSettingsTab,
      activeVaultNavItem,
      activeView,
      linearSelection,
      settingsOpen,
      sidebarSegments,
    ],
  );

  return (
    <ContentPanelFrame
      sidebarOpen={sidebarOpen}
      hideSidebar={hideSidebar}
      activeVaultNavItem={activeVaultNavItem}
      vaultExplorerEnabled={vaultExplorerEnabled}
      breadcrumbSegments={breadcrumbSegments}
    >
      {children}
    </ContentPanelFrame>
  );
}

export function ContentPanel({
  sidebarOpen,
  hideSidebar = false,
  activeVaultNavItem,
  vaultExplorerEnabled,
  settingsOpen,
  activeSettingsTab,
  activeView,
  activeSessionTitle,
  children,
}: {
  sidebarOpen: boolean;
  hideSidebar?: boolean;
  activeVaultNavItem: SidebarNavItemId | null;
  vaultExplorerEnabled: boolean;
  settingsOpen: boolean;
  activeSettingsTab: SettingsTabId;
  activeView: AppView;
  activeSessionTitle?: string | null;
  children: ReactNode;
}) {
  return (
    <ContentPanelNavigationProvider projectsNavActive={activeVaultNavItem === "projects"}>
      <ContentPanelWithBreadcrumbs
        sidebarOpen={sidebarOpen}
        hideSidebar={hideSidebar}
        activeVaultNavItem={activeVaultNavItem}
        vaultExplorerEnabled={vaultExplorerEnabled}
        settingsOpen={settingsOpen}
        activeSettingsTab={activeSettingsTab}
        activeView={activeView}
        activeSessionTitle={activeSessionTitle}
      >
        {children}
      </ContentPanelWithBreadcrumbs>
    </ContentPanelNavigationProvider>
  );
}
