import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ContentPanelBreadcrumbBar } from "./ContentPanelBreadcrumbBar";
import { ContentPanelTabsBar } from "./ContentPanelTabsBar";
import { ContentPanelSidebarSlot } from "./ContentPanelSidebarSlot";
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
import { registerContentPanelLocalBack } from "../lib/contentPanelLocalBack";
import { LinearStatusIcon } from "../chat/LinearStatusIcon";
import { sidebarNavItemLabel, type SidebarNavItemId } from "../lib/sidebarNavItems";
import type { SettingsTabId } from "../settings/settingsTabs";
import { sidebarNavItemIcon } from "./sidebarNavConfig";
import { resolveLinearIssueTabLabel } from "../lib/inboxDraftIssue";
import { formatVaultWorkoutDocumentLabel } from "../lib/workouts/workoutsBreadcrumb";
import { WorkoutsPeriodViewProvider } from "./workouts/WorkoutsPeriodViewContext";
import { ContentPanelTabShortcuts } from "../shortcuts/ContentPanelTabShortcuts";
import { isIosDevice } from "../platform/iosStandalone";
import { IosPullToRefreshIndicator } from "./IosPullToRefreshIndicator";
import { ContentPanelChromeStatus } from "./ContentPanelChromeStatus";
import { useIosHorizontalSwipe } from "../hooks/useIosHorizontalSwipe";
import { useNarrowContentLayout } from "../hooks/useNarrowContentLayout";
import {
  isIosListSwipeNavItem,
  isIosProjectsTableSidebarLayout,
} from "../lib/iosListSidebarNav";
import {
  resolveContentPanelSidebarPresentation,
  shouldMountIosSidebarOverlay,
  shouldShowContentPanelMainSlot,
} from "../lib/contentPanelSidebarPresentation";

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
    return resolveLinearIssueTabLabel(activeLinearIssue, {
      hideIdentifier:
        activeVaultNavItem === "inbox" ||
        activeVaultNavItem === "contacts" ||
        activeVaultNavItem === "workouts",
    });
  }

  if (activeLinearDocument) {
    return activeLinearDocument.title;
  }

  if (activeVaultDocument) {
    return activeVaultNavItem === "workouts"
      ? formatVaultWorkoutDocumentLabel(activeVaultDocument.path, activeVaultDocument.title)
      : activeVaultDocument.title;
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

  if (activeVaultNavItem === "organizations") {
    if (linearSelection?.kind === "team" && linearWorkspaceView) {
      return `${linearSelection.name} · ${linearWorkspaceViewLabel(
        linearSelection.kind,
        linearWorkspaceView,
      )}`;
    }
    if (linearSelection?.kind === "team") {
      return linearSelection.name;
    }
    return sidebarNavItemLabel("organizations");
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
  inboxLinearTeamId,
  dailyLinearTeamId,
  workoutsLinearTeamId,
  lettersLinearTeamId,
  knowledgeBaseLinearTeamId,
  addressbookLinearTeamId,
  linearWorkspaceEnabled,
  vaultExplorerEnabled,
  breadcrumbSegments,
  navigationCollapsed = false,
  onOpenNavigation,
  settingsOpen = false,
  children,
}: {
  sidebarOpen: boolean;
  hideSidebar?: boolean;
  activeVaultNavItem: SidebarNavItemId | null;
  onVaultNavItemChange: (item: SidebarNavItemId | null) => void;
  inboxLinearTeamId: string | null;
  dailyLinearTeamId: string | null;
  workoutsLinearTeamId: string | null;
  lettersLinearTeamId: string | null;
  knowledgeBaseLinearTeamId: string | null;
  addressbookLinearTeamId: string | null;
  linearWorkspaceEnabled: boolean;
  vaultExplorerEnabled: boolean;
  breadcrumbSegments: ReturnType<typeof buildContentPanelBreadcrumbSegments>;
  navigationCollapsed?: boolean;
  onOpenNavigation?: () => void;
  settingsOpen?: boolean;
  children: ReactNode;
}) {
  const contentPanelShellRef = useRef<HTMLDivElement>(null);
  const contentPanelMainRef = useRef<HTMLDivElement>(null);
  const [narrowContentSidebar, setNarrowContentSidebar] = useState(false);
  const [narrowSidebarInitialSelectionKey, setNarrowSidebarInitialSelectionKey] = useState<string | null>(
    null,
  );
  const narrowContentLayout = useNarrowContentLayout();
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

  const contentSelectionKey = useMemo(
    () =>
      [
        activeVaultNavItem ?? "",
        linearSelection ? `${linearSelection.kind}:${linearSelection.id}` : "",
        activeVaultDocument?.path ?? "",
        activeLinearDocument?.id ?? "",
        activeLinearIssue?.id ?? "",
      ].join("|"),
    [
      activeLinearDocument?.id,
      activeLinearIssue?.id,
      activeVaultDocument?.path,
      activeVaultNavItem,
      linearSelection,
    ],
  );

  const listOnlyContentSelectionKey = useMemo(
    () => [activeVaultNavItem ?? "", "", "", "", ""].join("|"),
    [activeVaultNavItem],
  );

  const hasDetailView = contentSelectionKey !== listOnlyContentSelectionKey;
  const iosDevice = isIosDevice();
  const iosListNavEnabled =
    iosDevice && narrowContentLayout && isIosListSwipeNavItem(activeVaultNavItem) && !hideSidebar;
  const iosProjectsTableLayout = isIosProjectsTableSidebarLayout(
    activeVaultNavItem,
    iosListNavEnabled,
  );
  const iosSidebarOverlayLayer = shouldMountIosSidebarOverlay({
    iosListNavEnabled,
    hasDetailView,
  });
  const sidebarPresentation = resolveContentPanelSidebarPresentation({
    hideSidebar,
    narrowContentLayout,
    iosListNavEnabled,
    hasDetailView,
    narrowContentSidebar,
    iosProjectsTableLayout,
  });
  const showMainContent = shouldShowContentPanelMainSlot({ presentation: sidebarPresentation });
  const iosSidebarOverlayOpen =
    iosListNavEnabled &&
    narrowContentSidebar &&
    hasDetailView &&
    narrowSidebarInitialSelectionKey != null &&
    contentSelectionKey === narrowSidebarInitialSelectionKey;

  useEffect(() => {
    if (!narrowContentLayout) {
      setNarrowContentSidebar(false);
      setNarrowSidebarInitialSelectionKey(null);
    }
  }, [narrowContentLayout]);

  useEffect(() => {
    if (!narrowContentSidebar || narrowSidebarInitialSelectionKey === null) return;
    if (contentSelectionKey === narrowSidebarInitialSelectionKey) return;
    setNarrowContentSidebar(false);
    setNarrowSidebarInitialSelectionKey(null);
  }, [contentSelectionKey, narrowContentSidebar, narrowSidebarInitialSelectionKey]);

  const openNarrowContentSidebar = useCallback(() => {
    if (!narrowContentLayout || !activeVaultNavItem || hideSidebar) return;
    setNarrowSidebarInitialSelectionKey(contentSelectionKey);
    setNarrowContentSidebar(true);
  }, [activeVaultNavItem, contentSelectionKey, hideSidebar, narrowContentLayout]);

  useEffect(() => {
    if (!iosListNavEnabled || settingsOpen) {
      return;
    }
    if (!activeVaultNavItem) {
      setNarrowContentSidebar(false);
      setNarrowSidebarInitialSelectionKey(null);
    }
  }, [activeVaultNavItem, iosListNavEnabled, settingsOpen]);

  const closeNarrowContentSidebar = useCallback(() => {
    setNarrowContentSidebar(false);
    setNarrowSidebarInitialSelectionKey(null);
  }, []);

  useIosHorizontalSwipe({
    targetRef: contentPanelMainRef,
    enabled: iosListNavEnabled && hasDetailView,
    onSwipeRight: openNarrowContentSidebar,
    allowSwipeRight: !narrowContentSidebar,
    allowSwipeLeft: false,
  });

  useIosHorizontalSwipe({
    targetRef: contentPanelMainRef,
    enabled: iosListNavEnabled && iosSidebarOverlayOpen,
    onSwipeLeft: closeNarrowContentSidebar,
    allowSwipeLeft: true,
    allowSwipeRight: false,
  });

  useEffect(() => {
    return registerContentPanelLocalBack(() => {
      if (!narrowContentSidebar) return false;
      if (iosListNavEnabled && !hasDetailView) return false;
      closeNarrowContentSidebar();
      return true;
    });
  }, [closeNarrowContentSidebar, hasDetailView, iosListNavEnabled, narrowContentSidebar]);

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

  const selectRelativeTab = useCallback(
    (direction: -1 | 1) => {
      if (!activeTabId || tabs.length <= 1) return;
      const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
      if (currentIndex === -1) return;
      const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
      handleSelectTab(tabs[nextIndex]!.id);
    },
    [activeTabId, handleSelectTab, tabs],
  );

  const handlePreviousTab = useCallback(() => {
    selectRelativeTab(-1);
  }, [selectRelativeTab]);

  const handleNextTab = useCallback(() => {
    selectRelativeTab(1);
  }, [selectRelativeTab]);

  const handleCloseActiveTab = useCallback(() => {
    if (!activeTabId) return;
    handleCloseTab(activeTabId);
  }, [activeTabId, handleCloseTab]);

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

  const sidebarPanelProps = {
    activeVaultNavItem,
    inboxLinearTeamId,
    dailyLinearTeamId,
    workoutsLinearTeamId,
    lettersLinearTeamId,
    knowledgeBaseLinearTeamId,
    addressbookLinearTeamId,
    linearWorkspaceEnabled,
    vaultExplorerEnabled,
  };
  const mainPanelBody = (
    <>
      {iosSidebarOverlayLayer ? (
        <button
          type="button"
          className="content-panel-ios-sidebar-backdrop"
          onClick={closeNarrowContentSidebar}
          aria-label="Close list"
          tabIndex={iosSidebarOverlayOpen ? 0 : -1}
        />
      ) : null}
      {sidebarPresentation === "desktop-resizable" ? (
        <ContentPanelSidebarSlot
          presentation="desktop-resizable"
          sidebarProps={sidebarPanelProps}
          sidebarOpen={sidebarOpen}
          onCloseNarrow={closeNarrowContentSidebar}
        />
      ) : null}
      {sidebarPresentation === "ios-overlay" || sidebarPresentation === "narrow-done" ? (
        <ContentPanelSidebarSlot
          presentation={sidebarPresentation}
          sidebarProps={sidebarPanelProps}
          sidebarOpen={sidebarOpen}
          onCloseNarrow={closeNarrowContentSidebar}
        />
      ) : null}
      {sidebarPresentation === "ios-inline" ? (
        <ContentPanelSidebarSlot
          presentation="ios-inline"
          sidebarProps={sidebarPanelProps}
          sidebarOpen={sidebarOpen}
          onCloseNarrow={closeNarrowContentSidebar}
        />
      ) : showMainContent ? (
        <div className="content-panel-content">{children}</div>
      ) : null}
    </>
  );
  const showContentPanelTabsBar = !isIosDevice();
  const showContentPanelBreadcrumbBar = !isIosDevice();

  return (
    <div className="content-panel-shell" ref={contentPanelShellRef}>
      {isIosDevice() ? <IosPullToRefreshIndicator contentRootRef={contentPanelShellRef} /> : null}
      {isIosDevice() ? (
        <ContentPanelChromeStatus className="content-panel-chrome-status--ios" />
      ) : null}
      <ContentPanelTabShortcuts
        enabled={!settingsOpen && showContentPanelTabsBar}
        onNewTab={handleAddTab}
        onCloseActiveTab={handleCloseActiveTab}
        onPreviousTab={handlePreviousTab}
        onNextTab={handleNextTab}
      />
      {showContentPanelTabsBar ? (
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
      ) : null}
      <div className="content-panel">
        {showContentPanelBreadcrumbBar ? (
          <ContentPanelBreadcrumbBar segments={displayedBreadcrumbSegments} />
        ) : null}
        <div
          ref={contentPanelMainRef}
          className={[
            "content-panel-main",
            iosSidebarOverlayLayer ? "content-panel-main--ios-sidebar-active" : null,
            iosSidebarOverlayOpen ? "content-panel-main--ios-sidebar-overlay-open" : null,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {mainPanelBody}
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
  inboxLinearTeamId,
  dailyLinearTeamId,
  workoutsLinearTeamId,
  lettersLinearTeamId,
  knowledgeBaseLinearTeamId,
  addressbookLinearTeamId,
  linearWorkspaceEnabled,
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
  inboxLinearTeamId: string | null;
  dailyLinearTeamId: string | null;
  workoutsLinearTeamId: string | null;
  lettersLinearTeamId: string | null;
  knowledgeBaseLinearTeamId: string | null;
  addressbookLinearTeamId: string | null;
  linearWorkspaceEnabled: boolean;
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
      inboxLinearTeamId={inboxLinearTeamId}
      dailyLinearTeamId={dailyLinearTeamId}
      workoutsLinearTeamId={workoutsLinearTeamId}
      lettersLinearTeamId={lettersLinearTeamId}
      knowledgeBaseLinearTeamId={knowledgeBaseLinearTeamId}
      addressbookLinearTeamId={addressbookLinearTeamId}
      linearWorkspaceEnabled={linearWorkspaceEnabled}
      vaultExplorerEnabled={vaultExplorerEnabled}
      breadcrumbSegments={breadcrumbSegments}
      navigationCollapsed={navigationCollapsed}
      onOpenNavigation={onOpenNavigation}
      settingsOpen={settingsOpen}
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
  inboxLinearTeamId,
  dailyLinearTeamId,
  workoutsLinearTeamId,
  lettersLinearTeamId,
  knowledgeBaseLinearTeamId,
  addressbookLinearTeamId,
  linearWorkspaceEnabled,
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
  inboxLinearTeamId: string | null;
  dailyLinearTeamId: string | null;
  workoutsLinearTeamId: string | null;
  lettersLinearTeamId: string | null;
  knowledgeBaseLinearTeamId: string | null;
  addressbookLinearTeamId: string | null;
  linearWorkspaceEnabled: boolean;
  vaultExplorerEnabled: boolean;
  navigationCollapsed?: boolean;
  onOpenNavigation?: () => void;
  settingsOpen: boolean;
  activeSettingsTab: SettingsTabId;
  children: ReactNode;
}) {
  return (
    <ContentListNavigationProvider>
      <WorkoutsPeriodViewProvider>
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
        inboxLinearTeamId={inboxLinearTeamId}
        dailyLinearTeamId={dailyLinearTeamId}
        workoutsLinearTeamId={workoutsLinearTeamId}
        lettersLinearTeamId={lettersLinearTeamId}
        knowledgeBaseLinearTeamId={knowledgeBaseLinearTeamId}
        addressbookLinearTeamId={addressbookLinearTeamId}
        linearWorkspaceEnabled={linearWorkspaceEnabled}
        vaultExplorerEnabled={vaultExplorerEnabled}
        navigationCollapsed={navigationCollapsed}
        onOpenNavigation={onOpenNavigation}
        settingsOpen={settingsOpen}
        activeSettingsTab={activeSettingsTab}
      >
        <ContentPanelMainSlot
          settingsOpen={settingsOpen}
          linearWorkspaceEnabled={linearWorkspaceEnabled}
          vaultStructureEnabled={vaultExplorerEnabled}
          activeVaultNavItem={activeVaultNavItem}
          lettersLinearTeamId={lettersLinearTeamId}
          inboxLinearTeamId={inboxLinearTeamId}
          workoutsLinearTeamId={workoutsLinearTeamId}
          workspaceTeamConfig={{
            inboxLinearTeamId,
            dailyLinearTeamId,
            workoutsLinearTeamId,
            lettersLinearTeamId,
            knowledgeBaseLinearTeamId,
            addressbookLinearTeamId,
          }}
        >
          {children}
        </ContentPanelMainSlot>
      </ContentPanelWithBreadcrumbs>
      </WorkoutsPeriodViewProvider>
    </ContentListNavigationProvider>
  );
}
