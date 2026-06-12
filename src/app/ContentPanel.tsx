import type { ReactNode } from "react";
import { useMemo } from "react";
import { ContentPanelBreadcrumbBar } from "./ContentPanelBreadcrumbBar";
import { ContentPanelSidebar } from "./ContentPanelSidebar";
import { ResizablePanel } from "./ResizablePanel";
import type { AppView } from "./appViews";
import { buildContentPanelBreadcrumbSegments } from "./contentPanelBreadcrumbModel";
import {
  useContentPanelNavigation,
} from "./contentPanelNavigation";
import { ContentPanelMainSlot } from "./ContentPanelMainSlot";
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
      <ContentPanelBreadcrumbBar segments={breadcrumbSegments} />
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
  const {
    sidebarSegments,
    linearSelection,
    activeVaultDocument,
    activeLinearIssue,
    clearActiveVaultDocument,
    clearActiveLinearIssue,
    linearWorkspaceView,
  } = useContentPanelNavigation();
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
        activeVaultDocument,
        activeLinearIssue,
        onClearActiveVaultDocument: clearActiveVaultDocument,
        onClearActiveLinearIssue: clearActiveLinearIssue,
        linearWorkspaceView,
      }),
    [
      activeLinearIssue,
      activeSessionTitle,
      activeSettingsTab,
      activeVaultDocument,
      activeVaultNavItem,
      activeView,
      clearActiveLinearIssue,
      clearActiveVaultDocument,
      linearSelection,
      linearWorkspaceView,
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
      <ContentPanelMainSlot
        settingsOpen={settingsOpen}
        vaultStructureEnabled={vaultExplorerEnabled}
      >
        {children}
      </ContentPanelMainSlot>
    </ContentPanelWithBreadcrumbs>
  );
}
