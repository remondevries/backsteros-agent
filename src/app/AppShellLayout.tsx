import type { ReactNode } from "react";
import { useCallback, useEffect } from "react";
import { ContentPanel } from "./ContentPanel";
import { ContentPanelNavigationProvider, useContentPanelNavigation } from "./contentPanelNavigation";
import { LeftSidePanel } from "./LeftSidePanel";
import { RightSidePanel } from "./RightSidePanel";
import type { AppView } from "./appViews";
import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import type { SettingsTabId } from "../settings/settingsTabs";
import type { ChatMessage, RunViewModel } from "../chat/types";
import { ResizablePanel } from "./ResizablePanel";
import { useSidePanelToggleShortcuts } from "../hooks/useSidePanelToggleShortcuts";
import { useSidePanelToggles } from "../hooks/useSidePanelToggles";
import { showTrafficLights } from "../lib/traffic-lights";
import { isTauriRuntime } from "../lib/tauriRuntime";

const LEFT_SIDE_PANEL_WIDTH_KEY = "backsteros.layout.leftPanelWidth";
const RIGHT_SIDE_PANEL_WIDTH_KEY = "backsteros.layout.rightPanelWidth";

type RightPanelSession = {
  sessionId: string;
  initialMessages: ChatMessage[];
  initialRuns: Record<string, RunViewModel>;
};

function AppMainShell({
  activeView,
  onViewChange,
  settingsOpen,
  activeSettingsTab,
  onSettingsTabChange,
  onOpenSettings,
  onExitSettings,
  savedNotesPath,
  rightPanelChatEnabled,
  rightPanelSession,
  rightPanelSessionLoading,
  onSaveRightPanelSessionState,
  activeVaultNavItem,
  onVaultNavItemChange,
  vaultExplorerEnabled,
  activeSessionTitle,
  children,
  leftSidePanelOpen,
  rightSidePanelOpen,
  contentPanelSidebarOpen,
  toggleLeftSidePanel,
  toggleRightSidePanel,
  toggleContentPanelSidebar,
}: {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  settingsOpen: boolean;
  activeSettingsTab: SettingsTabId;
  onSettingsTabChange: (tab: SettingsTabId) => void;
  onOpenSettings: () => void;
  onExitSettings?: () => void;
  savedNotesPath: string | null;
  rightPanelChatEnabled: boolean;
  rightPanelSession: RightPanelSession | null;
  rightPanelSessionLoading: boolean;
  onSaveRightPanelSessionState: (
    sessionId: string,
    messages: ChatMessage[],
    runs: Record<string, RunViewModel>,
  ) => void;
  activeVaultNavItem: SidebarNavItemId | null;
  onVaultNavItemChange: (item: SidebarNavItemId | null) => void;
  vaultExplorerEnabled: boolean;
  activeSessionTitle?: string | null;
  children: ReactNode;
  leftSidePanelOpen: boolean;
  rightSidePanelOpen: boolean;
  contentPanelSidebarOpen: boolean;
  toggleLeftSidePanel: () => void;
  toggleRightSidePanel: () => void;
  toggleContentPanelSidebar: () => void;
}) {
  const { activeLinearDocument, clearActiveVaultDocument, resetProjectsOverview } =
    useContentPanelNavigation();
  const showContentPanelSidebar =
    contentPanelSidebarOpen && activeLinearDocument === null;

  const handleVaultNavItemChange = useCallback(
    (item: SidebarNavItemId | null) => {
      const switchingNavItem = item !== activeVaultNavItem;
      if (switchingNavItem) {
        // Always reset focused content when moving between nav destinations.
        clearActiveVaultDocument();
        resetProjectsOverview();
      }
      onVaultNavItemChange(item);
    },
    [activeVaultNavItem, clearActiveVaultDocument, onVaultNavItemChange, resetProjectsOverview],
  );

  useSidePanelToggleShortcuts({
    enabled: !settingsOpen,
    onToggleLeftSidePanel: toggleLeftSidePanel,
    onToggleRightSidePanel: toggleRightSidePanel,
    onToggleContentPanelSidebar: toggleContentPanelSidebar,
  });

  useEffect(() => {
    if (!isTauriRuntime()) return;
    showTrafficLights();
  }, []);

  return (
    <div className="app-main-shell">
      <div className="app-window-chrome" aria-hidden="true">
        <div className="app-window-traffic-safe" data-tauri-drag-region={false} />
        <div className="app-window-drag" data-tauri-drag-region />
      </div>
      <ResizablePanel
        side="left"
        className="app-resizable-panel-outer"
        storageKey={LEFT_SIDE_PANEL_WIDTH_KEY}
        defaultWidth={232}
        minWidth={200}
        maxWidth={320}
        ariaLabel="Left side panel"
        collapsed={!leftSidePanelOpen}
      >
        <LeftSidePanel
          activeView={activeView}
          onChange={onViewChange}
          settingsOpen={settingsOpen}
          activeSettingsTab={activeSettingsTab}
          onSettingsTabChange={onSettingsTabChange}
          onOpenSettings={onOpenSettings}
          onExitSettings={onExitSettings}
          savedNotesPath={savedNotesPath}
          activeVaultNavItem={activeVaultNavItem}
          onVaultNavItemChange={handleVaultNavItemChange}
        />
      </ResizablePanel>

      <div className="content-panel-slot">
        <ContentPanel
          sidebarOpen={showContentPanelSidebar}
          hideSidebar={settingsOpen || activeVaultNavItem === "projects"}
          activeVaultNavItem={activeVaultNavItem}
          onVaultNavItemChange={handleVaultNavItemChange}
          vaultExplorerEnabled={vaultExplorerEnabled}
          settingsOpen={settingsOpen}
          activeSettingsTab={activeSettingsTab}
          activeView={activeView}
          activeSessionTitle={activeSessionTitle}
        >
          {children}
        </ContentPanel>
      </div>

      <ResizablePanel
        side="right"
        className="app-resizable-panel-outer"
        storageKey={RIGHT_SIDE_PANEL_WIDTH_KEY}
        defaultWidth={280}
        minWidth={200}
        maxWidth={480}
        ariaLabel="Right side panel"
        collapsed={!rightSidePanelOpen}
      >
        <RightSidePanel
          chatEnabled={rightPanelChatEnabled}
          session={rightPanelSession}
          sessionLoading={rightPanelSessionLoading}
          onNavigateToView={onViewChange}
          onSaveSessionState={onSaveRightPanelSessionState}
        />
      </ResizablePanel>
    </div>
  );
}

export function AppShellLayout({
  activeView,
  onViewChange,
  settingsOpen,
  activeSettingsTab,
  onSettingsTabChange,
  onOpenSettings,
  onExitSettings,
  savedNotesPath,
  rightPanelChatEnabled,
  rightPanelSession,
  rightPanelSessionLoading,
  onSaveRightPanelSessionState,
  activeVaultNavItem,
  onVaultNavItemChange,
  vaultExplorerEnabled,
  activeSessionTitle,
  children,
}: {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  settingsOpen: boolean;
  activeSettingsTab: SettingsTabId;
  onSettingsTabChange: (tab: SettingsTabId) => void;
  onOpenSettings: () => void;
  onExitSettings?: () => void;
  savedNotesPath: string | null;
  rightPanelChatEnabled: boolean;
  rightPanelSession: RightPanelSession | null;
  rightPanelSessionLoading: boolean;
  onSaveRightPanelSessionState: (
    sessionId: string,
    messages: ChatMessage[],
    runs: Record<string, RunViewModel>,
  ) => void;
  activeVaultNavItem: SidebarNavItemId | null;
  onVaultNavItemChange: (item: SidebarNavItemId | null) => void;
  vaultExplorerEnabled: boolean;
  activeSessionTitle?: string | null;
  children: ReactNode;
}) {
  const {
    leftSidePanelOpen,
    rightSidePanelOpen,
    contentPanelSidebarOpen,
    toggleLeftSidePanel,
    toggleRightSidePanel,
    toggleContentPanelSidebar,
  } = useSidePanelToggles();

  return (
    <ContentPanelNavigationProvider>
      <AppMainShell
        activeView={activeView}
        onViewChange={onViewChange}
        settingsOpen={settingsOpen}
        activeSettingsTab={activeSettingsTab}
        onSettingsTabChange={onSettingsTabChange}
        onOpenSettings={onOpenSettings}
        onExitSettings={onExitSettings}
        savedNotesPath={savedNotesPath}
        rightPanelChatEnabled={rightPanelChatEnabled}
        rightPanelSession={rightPanelSession}
        rightPanelSessionLoading={rightPanelSessionLoading}
        onSaveRightPanelSessionState={onSaveRightPanelSessionState}
        activeVaultNavItem={activeVaultNavItem}
        onVaultNavItemChange={onVaultNavItemChange}
        vaultExplorerEnabled={vaultExplorerEnabled}
        activeSessionTitle={activeSessionTitle}
        leftSidePanelOpen={leftSidePanelOpen}
        rightSidePanelOpen={rightSidePanelOpen}
        contentPanelSidebarOpen={contentPanelSidebarOpen}
        toggleLeftSidePanel={toggleLeftSidePanel}
        toggleRightSidePanel={toggleRightSidePanel}
        toggleContentPanelSidebar={toggleContentPanelSidebar}
      >
        {children}
      </AppMainShell>
    </ContentPanelNavigationProvider>
  );
}
