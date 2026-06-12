import type { ReactNode } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { ContentPanelBreadcrumbBar } from "./ContentPanelBreadcrumbBar";
import { ContentPanelTabsBar } from "./ContentPanelTabsBar";
import { ContentPanelSidebar } from "./ContentPanelSidebar";
import { ResizablePanel } from "./ResizablePanel";
import type { AppView } from "./appViews";
import { buildContentPanelBreadcrumbSegments } from "./contentPanelBreadcrumbModel";
import {
  type ContentPanelTabSnapshot,
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
  const {
    sidebarSegments,
    linearSelection,
    activeVaultDocument,
    activeLinearDocument,
    activeLinearIssue,
    focusContentSnapshot,
    linearWorkspaceView,
    restoreContentPanelTabSnapshot,
  } = useContentPanelNavigation();

  const captureSnapshot = useCallback((): ContentPanelTabSnapshot => {
    return {
      sidebarSegments: sidebarSegments.map((segment) => ({ ...segment })),
      linearSelection: linearSelection ? { ...linearSelection } : null,
      activeVaultDocument: activeVaultDocument ? { ...activeVaultDocument } : null,
      activeLinearDocument: activeLinearDocument ? { ...activeLinearDocument } : null,
      activeLinearIssue: activeLinearIssue ? { ...activeLinearIssue } : null,
      focusContentSnapshot: focusContentSnapshot ? { ...focusContentSnapshot } : null,
      linearWorkspaceView,
    };
  }, [
    activeLinearDocument,
    activeLinearIssue,
    activeVaultDocument,
    focusContentSnapshot,
    linearSelection,
    linearWorkspaceView,
    sidebarSegments,
  ]);

  const createEmptySnapshot = useCallback(
    (): ContentPanelTabSnapshot => ({
      sidebarSegments: [],
      linearSelection: null,
      activeVaultDocument: null,
      activeLinearDocument: null,
      activeLinearIssue: null,
      focusContentSnapshot: null,
      linearWorkspaceView: null,
    }),
    [],
  );

  const [tabs, setTabs] = useState<Array<{ id: string; label: string; snapshot: ContentPanelTabSnapshot }>>(
    () => [{ id: "content-tab-1", label: "Clients", snapshot: createEmptySnapshot() }],
  );
  const [activeTabId, setActiveTabId] = useState<string | null>("content-tab-1");
  const nextTabNumberRef = useRef(1);

  const handleSelectTab = useCallback((tabId: string) => {
    if (tabId === activeTabId) return;
    const nextTab = tabs.find((tab) => tab.id === tabId);
    if (!nextTab) return;
    const currentSnapshot = captureSnapshot();
    setTabs((current) =>
      current.map((tab) => {
        if (tab.id === activeTabId) return { ...tab, snapshot: currentSnapshot };
        return tab;
      }),
    );
    restoreContentPanelTabSnapshot(nextTab.snapshot);
    setActiveTabId(tabId);
  }, [activeTabId, captureSnapshot, restoreContentPanelTabSnapshot, tabs]);

  const handleAddTab = useCallback(() => {
    const currentSnapshot = captureSnapshot();
    const nextSnapshot = createEmptySnapshot();
    nextTabNumberRef.current += 1;
    const number = nextTabNumberRef.current;
    const tabId = `content-tab-${number}`;
    const tabLabel = number === 1 ? "Clients" : `Clients ${number}`;
    setTabs((current) => [
      ...current.map((tab) =>
        tab.id === activeTabId ? { ...tab, snapshot: currentSnapshot } : tab,
      ),
      { id: tabId, label: tabLabel, snapshot: nextSnapshot },
    ]);
    restoreContentPanelTabSnapshot(nextSnapshot);
    setActiveTabId(tabId);
  }, [activeTabId, captureSnapshot, createEmptySnapshot, restoreContentPanelTabSnapshot]);

  return (
    <div className="content-panel">
      <ContentPanelTabsBar
        tabs={tabs.map((tab) => ({ id: tab.id, label: tab.label }))}
        activeTabId={activeTabId}
        onSelectTab={handleSelectTab}
        onAddTab={handleAddTab}
      />
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
    activeLinearDocument,
    activeLinearIssue,
    clearActiveVaultDocument,
    clearActiveLinearDocument,
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
        activeLinearDocument,
        activeLinearIssue,
        onClearActiveVaultDocument: clearActiveVaultDocument,
        onClearActiveLinearDocument: clearActiveLinearDocument,
        onClearActiveLinearIssue: clearActiveLinearIssue,
        linearWorkspaceView,
      }),
    [
      activeLinearIssue,
      activeLinearDocument,
      activeSessionTitle,
      activeSettingsTab,
      activeVaultDocument,
      activeVaultNavItem,
      activeView,
      clearActiveLinearDocument,
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
        activeVaultNavItem={activeVaultNavItem}
      >
        {children}
      </ContentPanelMainSlot>
    </ContentPanelWithBreadcrumbs>
  );
}
