import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ContentPanelBreadcrumbBar } from "./ContentPanelBreadcrumbBar";
import { ContentPanelTabsBar } from "./ContentPanelTabsBar";
import { ContentPanelSidebar } from "./ContentPanelSidebar";
import { ResizablePanel } from "./ResizablePanel";
import { linearWorkspaceViewLabel } from "./linearProjectViews";
import { buildContentPanelBreadcrumbSegments } from "./contentPanelBreadcrumbModel";
import {
  type ContentPanelTabSnapshot,
  getFocusContentController,
  useContentPanelNavigation,
  useFocusContent,
} from "./contentPanelNavigation";
import { ContentPanelMainSlot } from "./ContentPanelMainSlot";
import { ContentListNavigationProvider, ContentListNavigationLayoutSync } from "../lib/contentListNavigationReact";
import { LinearStatusIcon } from "../chat/LinearStatusIcon";
import { sidebarNavItemLabel, type SidebarNavItemId } from "../lib/sidebarNavItems";
import type { SettingsTabId } from "../settings/settingsTabs";
import { sidebarNavItemIcon } from "./sidebarNavConfig";

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

function resolveContentTabIcon({
  activeVaultNavItem,
  linearSelection,
  activeLinearDocument,
  activeLinearIssue,
}: {
  activeVaultNavItem: SidebarNavItemId | null;
  linearSelection: ReturnType<typeof useContentPanelNavigation>["linearSelection"];
  activeLinearDocument: ReturnType<typeof useContentPanelNavigation>["activeLinearDocument"];
  activeLinearIssue: ReturnType<typeof useContentPanelNavigation>["activeLinearIssue"];
}): ReactNode | undefined {
  if (activeLinearIssue) {
    return (
      <LinearStatusIcon
        status={activeLinearIssue.status}
        stateType={activeLinearIssue.stateType}
      />
    );
  }

  if (activeVaultNavItem) {
    return sidebarNavItemIcon(activeVaultNavItem);
  }

  if (linearSelection || activeLinearDocument) {
    return sidebarNavItemIcon("projects");
  }

  return undefined;
}

function ContentPanelFrame({
  sidebarOpen,
  hideSidebar = false,
  activeVaultNavItem,
  onVaultNavItemChange,
  vaultExplorerEnabled,
  breadcrumbSegments,
  navigationCollapsed = false,
  onOpenNavigation,
  children,
}: {
  sidebarOpen: boolean;
  hideSidebar?: boolean;
  activeVaultNavItem: SidebarNavItemId | null;
  onVaultNavItemChange: (item: SidebarNavItemId | null) => void;
  vaultExplorerEnabled: boolean;
  breadcrumbSegments: ReturnType<typeof buildContentPanelBreadcrumbSegments>;
  navigationCollapsed?: boolean;
  onOpenNavigation?: () => void;
  children: ReactNode;
}) {
  const [narrowContentSidebar, setNarrowContentSidebar] = useState(false);
  const [narrowSidebarInitialSelectionKey, setNarrowSidebarInitialSelectionKey] = useState<string | null>(
    null,
  );
  const [narrowContentLayout, setNarrowContentLayout] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(max-width: 720px)").matches,
  );
  const {
    sidebarSegments,
    linearSelection,
    activeVaultDocument,
    activeLinearDocument,
    activeLinearIssue,
    linearWorkspaceView,
    issuesPanelMode,
    watchersPanelMode,
    restoreContentPanelTabSnapshot,
  } = useContentPanelNavigation();
  const { flushFocusContentSnapshot } = useFocusContent();

  const sidebarFolderKey = sidebarSegments.map((segment) => segment.id).join("/");

  const currentSelectionKey = [
    activeVaultNavItem ?? "",
    linearSelection ? `${linearSelection.kind}:${linearSelection.id}` : "",
    activeVaultDocument?.path ?? "",
    activeLinearDocument?.id ?? "",
    activeLinearIssue?.id ?? "",
    sidebarFolderKey,
  ].join("|");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 720px)");
    const handleChange = () => {
      setNarrowContentLayout(mediaQuery.matches);
      if (!mediaQuery.matches) {
        setNarrowContentSidebar(false);
        setNarrowSidebarInitialSelectionKey(null);
      }
    };
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!narrowContentSidebar || narrowSidebarInitialSelectionKey === null) return;
    if (currentSelectionKey === narrowSidebarInitialSelectionKey) return;
    setNarrowContentSidebar(false);
    setNarrowSidebarInitialSelectionKey(null);
  }, [currentSelectionKey, narrowContentSidebar, narrowSidebarInitialSelectionKey]);

  const openNarrowContentSidebar = useCallback(() => {
    if (!narrowContentLayout || !activeVaultNavItem || hideSidebar) return;
    setNarrowSidebarInitialSelectionKey(currentSelectionKey);
    setNarrowContentSidebar(true);
  }, [activeVaultNavItem, currentSelectionKey, hideSidebar, narrowContentLayout]);

  const closeNarrowContentSidebar = useCallback(() => {
    setNarrowContentSidebar(false);
    setNarrowSidebarInitialSelectionKey(null);
  }, []);

  const captureSnapshot = useCallback((): ContentPanelTabSnapshot => {
    flushFocusContentSnapshot();
    const snapshot = getFocusContentController()?.getSnapshot() ?? null;
    return {
      sidebarSegments: sidebarSegments.map((segment) => ({ ...segment })),
      linearSelection: linearSelection ? { ...linearSelection } : null,
      activeVaultDocument: activeVaultDocument ? { ...activeVaultDocument } : null,
      activeLinearDocument: activeLinearDocument ? { ...activeLinearDocument } : null,
      activeLinearIssue: activeLinearIssue ? { ...activeLinearIssue } : null,
      focusContentSnapshot: snapshot ? { ...snapshot } : null,
      linearWorkspaceView,
      issuesPanelMode,
      watchersPanelMode,
    };
  }, [
    activeLinearDocument,
    activeLinearIssue,
    activeVaultDocument,
    flushFocusContentSnapshot,
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

  const handleCloseTab = useCallback(
    (tabId: string) => {
      if (tabs.length <= 1) return;
      const tabIndex = tabs.findIndex((tab) => tab.id === tabId);
      if (tabIndex === -1) return;

      const closingActiveTab = tabId === activeTabId;
      const fallbackTab =
        tabs[tabIndex + 1] ?? tabs[tabIndex - 1] ?? tabs.find((tab) => tab.id !== tabId) ?? null;

      setTabs((current) => {
        const withSavedActive = closingActiveTab
          ? current.map((tab) =>
              tab.id === activeTabId
                ? {
                    ...tab,
                    label: activeTabLabel,
                    snapshot: captureSnapshot(),
                    activeVaultNavItem,
                  }
                : tab,
            )
          : current;
        return withSavedActive.filter((tab) => tab.id !== tabId);
      });

      if (!closingActiveTab || !fallbackTab) return;
      if (fallbackTab.activeVaultNavItem !== activeVaultNavItem) {
        onVaultNavItemChange(fallbackTab.activeVaultNavItem);
      }
      restoreContentPanelTabSnapshot(fallbackTab.snapshot);
      setActiveTabId(fallbackTab.id);
    },
    [
      activeTabId,
      activeTabLabel,
      activeVaultNavItem,
      captureSnapshot,
      onVaultNavItemChange,
      restoreContentPanelTabSnapshot,
      tabs,
    ],
  );

  const displayedBreadcrumbSegments = useMemo(() => {
    if (!narrowContentLayout || !activeVaultNavItem || hideSidebar || breadcrumbSegments.length === 0) {
      return breadcrumbSegments;
    }
    const [firstSegment, ...restSegments] = breadcrumbSegments;
    if (!firstSegment?.navItemId) return breadcrumbSegments;
    return [
      {
        ...firstSegment,
        onActivate: openNarrowContentSidebar,
      },
      ...restSegments,
    ];
  }, [
    activeVaultNavItem,
    breadcrumbSegments,
    hideSidebar,
    narrowContentLayout,
    openNarrowContentSidebar,
  ]);

  return (
    <div className="content-panel-shell">
      <ContentPanelTabsBar
        tabs={tabs.map((tab) => {
          const isActiveTab = tab.id === activeTabId;
          const icon = resolveContentTabIcon({
            activeVaultNavItem: isActiveTab ? activeVaultNavItem : tab.activeVaultNavItem,
            linearSelection: isActiveTab ? linearSelection : tab.snapshot.linearSelection,
            activeLinearDocument: isActiveTab ? activeLinearDocument : tab.snapshot.activeLinearDocument,
            activeLinearIssue: isActiveTab ? activeLinearIssue : tab.snapshot.activeLinearIssue,
          });
          return { id: tab.id, label: tab.label, icon };
        })}
        activeTabId={activeTabId}
        onSelectTab={handleSelectTab}
        onAddTab={handleAddTab}
        onCloseTab={handleCloseTab}
        navigationCollapsed={navigationCollapsed}
        onOpenNavigation={onOpenNavigation}
      />
      <div className="content-panel">
        <ContentPanelBreadcrumbBar segments={displayedBreadcrumbSegments} />
        <div className="content-panel-main">
          {narrowContentSidebar && !hideSidebar ? (
            <div className="content-panel-narrow-sidebar">
              <div className="content-panel-narrow-sidebar-header">
                <button
                  type="button"
                  className="content-panel-narrow-sidebar-done"
                  onClick={closeNarrowContentSidebar}
                >
                  Done
                </button>
              </div>
              <ContentPanelSidebar
                activeVaultNavItem={activeVaultNavItem}
                vaultExplorerEnabled={vaultExplorerEnabled}
              />
            </div>
          ) : !hideSidebar ? (
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
          {!narrowContentSidebar ? (
            <div className="content-panel-content">{children}</div>
          ) : null}
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
  navigationCollapsed = false,
  onOpenNavigation,
  settingsOpen,
  activeSettingsTab,
  children,
}: {
  sidebarOpen: boolean;
  hideSidebar?: boolean;
  activeVaultNavItem: SidebarNavItemId | null;
  onVaultNavItemChange: (item: SidebarNavItemId | null) => void;
  vaultExplorerEnabled: boolean;
  navigationCollapsed?: boolean;
  onOpenNavigation?: () => void;
  settingsOpen: boolean;
  activeSettingsTab: SettingsTabId;
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
  const handleActivateNavItemBreadcrumb = useCallback(
    (item: SidebarNavItemId) => {
      if (activeVaultNavItem === item) {
        onVaultNavItemChange(null);
        window.requestAnimationFrame(() => onVaultNavItemChange(item));
        return;
      }
      onVaultNavItemChange(item);
    },
    [activeVaultNavItem, onVaultNavItemChange],
  );
  const breadcrumbSegments = useMemo(
    () =>
      buildContentPanelBreadcrumbSegments({
        settingsOpen,
        activeSettingsTab,
        activeVaultNavItem,
        sidebarSegments,
        linearSelection,
        activeVaultDocument,
        activeLinearDocument,
        activeLinearIssue,
        onClearActiveVaultDocument: clearActiveVaultDocument,
        onClearActiveLinearDocument: clearActiveLinearDocument,
        onClearActiveLinearIssue: clearActiveLinearIssue,
        onActivateNavItem: handleActivateNavItemBreadcrumb,
        linearWorkspaceView,
      }),
    [
      activeLinearIssue,
      activeLinearDocument,
      activeSettingsTab,
      activeVaultDocument,
      activeVaultNavItem,
      clearActiveLinearDocument,
      clearActiveLinearIssue,
      clearActiveVaultDocument,
      handleActivateNavItemBreadcrumb,
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
      navigationCollapsed={navigationCollapsed}
      onOpenNavigation={onOpenNavigation}
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
  navigationCollapsed = false,
  onOpenNavigation,
  settingsOpen,
  activeSettingsTab,
  children,
}: {
  sidebarOpen: boolean;
  hideSidebar?: boolean;
  activeVaultNavItem: SidebarNavItemId | null;
  onVaultNavItemChange: (item: SidebarNavItemId | null) => void;
  vaultExplorerEnabled: boolean;
  navigationCollapsed?: boolean;
  onOpenNavigation?: () => void;
  settingsOpen: boolean;
  activeSettingsTab: SettingsTabId;
  children: ReactNode;
}) {
  return (
    <ContentListNavigationProvider>
      <ContentListNavigationLayoutSync
        activeVaultNavItem={activeVaultNavItem}
        hideSidebar={hideSidebar}
        settingsOpen={settingsOpen}
      />
      <ContentPanelWithBreadcrumbs
        sidebarOpen={sidebarOpen}
        hideSidebar={hideSidebar}
        activeVaultNavItem={activeVaultNavItem}
        onVaultNavItemChange={onVaultNavItemChange}
        vaultExplorerEnabled={vaultExplorerEnabled}
        navigationCollapsed={navigationCollapsed}
        onOpenNavigation={onOpenNavigation}
        settingsOpen={settingsOpen}
        activeSettingsTab={activeSettingsTab}
      >
        <ContentPanelMainSlot
          settingsOpen={settingsOpen}
          vaultStructureEnabled={vaultExplorerEnabled}
          activeVaultNavItem={activeVaultNavItem}
        >
          {children}
        </ContentPanelMainSlot>
      </ContentPanelWithBreadcrumbs>
    </ContentListNavigationProvider>
  );
}
