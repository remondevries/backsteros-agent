import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ContentPanelBreadcrumbBar } from "./ContentPanelBreadcrumbBar";
import { ContentPanelTabsBar } from "./ContentPanelTabsBar";
import { ContentPanelSidebar } from "./ContentPanelSidebar";
import { ResizablePanel } from "./ResizablePanel";
import type { AppView } from "./appViews";
import { linearWorkspaceViewLabel } from "./linearProjectViews";
import { buildContentPanelBreadcrumbSegments } from "./contentPanelBreadcrumbModel";
import {
  type ContentPanelTabSnapshot,
  useContentPanelNavigation,
} from "./contentPanelNavigation";
import { ContentPanelMainSlot } from "./ContentPanelMainSlot";
import { sidebarNavItemLabel, type SidebarNavItemId } from "../lib/sidebarNavItems";
import type { SettingsTabId } from "../settings/settingsTabs";

const CONTENT_PANEL_SIDEBAR_WIDTH_KEY = "backsteros.layout.contentPanelWidth";
const DEFAULT_CONTENT_TAB_LABEL = "Workspace";

function buildContentTabLabel({
  activeVaultNavItem,
  linearSelection,
  activeVaultDocument,
  activeLinearDocument,
  activeLinearIssue,
  linearWorkspaceView,
}: {
  activeVaultNavItem: SidebarNavItemId | null;
  linearSelection: ReturnType<typeof useContentPanelNavigation>["linearSelection"];
  activeVaultDocument: ReturnType<typeof useContentPanelNavigation>["activeVaultDocument"];
  activeLinearDocument: ReturnType<typeof useContentPanelNavigation>["activeLinearDocument"];
  activeLinearIssue: ReturnType<typeof useContentPanelNavigation>["activeLinearIssue"];
  linearWorkspaceView: ReturnType<typeof useContentPanelNavigation>["linearWorkspaceView"];
}) {
  if (activeLinearIssue) {
    return activeLinearIssue.identifier;
  }

  if (activeLinearDocument) {
    return activeLinearDocument.title;
  }

  if (activeVaultDocument) {
    return activeVaultDocument.title;
  }

  if (activeVaultNavItem === "projects") {
    if (linearSelection && linearWorkspaceView) {
      return `${linearSelection.name} · ${linearWorkspaceViewLabel(
        linearSelection.kind,
        linearWorkspaceView,
      )}`;
    }
    if (linearSelection) {
      return linearSelection.name;
    }
    return "Projects";
  }

  if (activeVaultNavItem) {
    return sidebarNavItemLabel(activeVaultNavItem);
  }

  return DEFAULT_CONTENT_TAB_LABEL;
}

function ContentPanelFrame({
  sidebarOpen,
  hideSidebar = false,
  activeVaultNavItem,
  onVaultNavItemChange,
  vaultExplorerEnabled,
  breadcrumbSegments,
  children,
}: {
  sidebarOpen: boolean;
  hideSidebar?: boolean;
  activeVaultNavItem: SidebarNavItemId | null;
  onVaultNavItemChange: (item: SidebarNavItemId | null) => void;
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
    issuesPanelMode,
    watchersPanelMode,
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
      issuesPanelMode,
      watchersPanelMode,
    };
  }, [
    activeLinearDocument,
    activeLinearIssue,
    activeVaultDocument,
    focusContentSnapshot,
    issuesPanelMode,
    linearSelection,
    linearWorkspaceView,
    watchersPanelMode,
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
      issuesPanelMode: "list",
      watchersPanelMode: "board",
    }),
    [],
  );
  const activeTabLabel = useMemo(
    () =>
      buildContentTabLabel({
        activeVaultNavItem,
        linearSelection,
        activeVaultDocument,
        activeLinearDocument,
        activeLinearIssue,
        linearWorkspaceView,
      }),
    [
      activeLinearDocument,
      activeLinearIssue,
      activeVaultDocument,
      activeVaultNavItem,
      linearSelection,
      linearWorkspaceView,
    ],
  );

  const [tabs, setTabs] = useState<
    Array<{
      id: string;
      label: string;
      snapshot: ContentPanelTabSnapshot;
      activeVaultNavItem: SidebarNavItemId | null;
    }>
  >(() => [
    {
      id: "content-tab-1",
      label: DEFAULT_CONTENT_TAB_LABEL,
      snapshot: createEmptySnapshot(),
      activeVaultNavItem: null,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string | null>("content-tab-1");
  const nextTabNumberRef = useRef(1);

  useEffect(() => {
    if (!activeTabId) return;
    setTabs((current) =>
      current.map((tab) =>
        tab.id === activeTabId && tab.label !== activeTabLabel
          ? { ...tab, label: activeTabLabel }
          : tab,
      ),
    );
  }, [activeTabId, activeTabLabel]);

  const handleSelectTab = useCallback((tabId: string) => {
    if (tabId === activeTabId) return;
    const nextTab = tabs.find((tab) => tab.id === tabId);
    if (!nextTab) return;
    const currentSnapshot = captureSnapshot();
    setTabs((current) =>
      current.map((tab) => {
        if (tab.id === activeTabId) {
          return {
            ...tab,
            label: activeTabLabel,
            snapshot: currentSnapshot,
            activeVaultNavItem,
          };
        }
        return tab;
      }),
    );
    if (nextTab.activeVaultNavItem !== activeVaultNavItem) {
      onVaultNavItemChange(nextTab.activeVaultNavItem);
    }
    restoreContentPanelTabSnapshot(nextTab.snapshot);
    setActiveTabId(tabId);
  }, [
    activeTabId,
    activeTabLabel,
    activeVaultNavItem,
    captureSnapshot,
    onVaultNavItemChange,
    restoreContentPanelTabSnapshot,
    tabs,
  ]);

  const handleAddTab = useCallback(() => {
    const currentSnapshot = captureSnapshot();
    const nextSnapshot = createEmptySnapshot();
    nextTabNumberRef.current += 1;
    const number = nextTabNumberRef.current;
    const tabId = `content-tab-${number}`;
    const tabLabel = DEFAULT_CONTENT_TAB_LABEL;
    setTabs((current) => [
      ...current.map((tab) =>
        tab.id === activeTabId
          ? {
              ...tab,
              label: activeTabLabel,
              snapshot: currentSnapshot,
              activeVaultNavItem,
            }
          : tab,
      ),
      { id: tabId, label: tabLabel, snapshot: nextSnapshot, activeVaultNavItem: null },
    ]);
    if (activeVaultNavItem !== null) {
      onVaultNavItemChange(null);
    }
    restoreContentPanelTabSnapshot(nextSnapshot);
    setActiveTabId(tabId);
  }, [
    activeTabId,
    activeTabLabel,
    activeVaultNavItem,
    captureSnapshot,
    createEmptySnapshot,
    onVaultNavItemChange,
    restoreContentPanelTabSnapshot,
  ]);

  return (
    <div className="content-panel-shell">
      <ContentPanelTabsBar
        tabs={tabs.map((tab) => ({ id: tab.id, label: tab.label }))}
        activeTabId={activeTabId}
        onSelectTab={handleSelectTab}
        onAddTab={handleAddTab}
      />
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
    </div>
  );
}

function ContentPanelWithBreadcrumbs({
  sidebarOpen,
  hideSidebar = false,
  activeVaultNavItem,
  onVaultNavItemChange,
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
  onVaultNavItemChange: (item: SidebarNavItemId | null) => void;
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
      onVaultNavItemChange={onVaultNavItemChange}
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
  onVaultNavItemChange,
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
  onVaultNavItemChange: (item: SidebarNavItemId | null) => void;
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
      onVaultNavItemChange={onVaultNavItemChange}
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
