import type { ReactNode } from "react";
import { ContentPanel } from "./ContentPanel";
import { LeftSidePanel } from "./LeftSidePanel";
import { RightSidePanel } from "./RightSidePanel";
import type { AppView } from "./appViews";
import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import type { SettingsTabId } from "../settings/settingsTabs";
import type { ChatMessage, RunViewModel } from "../chat/types";
import { ResizablePanel } from "./ResizablePanel";
import { useSidePanelToggleShortcuts } from "../hooks/useSidePanelToggleShortcuts";
import { useSidePanelToggles } from "../hooks/useSidePanelToggles";

const LEFT_SIDE_PANEL_WIDTH_KEY = "backsteros.layout.leftPanelWidth";
const RIGHT_SIDE_PANEL_WIDTH_KEY = "backsteros.layout.rightPanelWidth";

type RightPanelSession = {
  sessionId: string;
  initialMessages: ChatMessage[];
  initialRuns: Record<string, RunViewModel>;
};

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
  onVaultNavItemChange: (item: SidebarNavItemId) => void;
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

  useSidePanelToggleShortcuts({
    enabled: !settingsOpen,
    onToggleLeftSidePanel: toggleLeftSidePanel,
    onToggleRightSidePanel: toggleRightSidePanel,
    onToggleContentPanelSidebar: toggleContentPanelSidebar,
  });

  return (
    <div className="app-main-shell">
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
          onVaultNavItemChange={onVaultNavItemChange}
        />
      </ResizablePanel>

      <div className="content-panel-slot">
        <ContentPanel
          sidebarOpen={contentPanelSidebarOpen}
          hideSidebar={settingsOpen}
          activeVaultNavItem={activeVaultNavItem}
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
          activeView={activeView}
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
