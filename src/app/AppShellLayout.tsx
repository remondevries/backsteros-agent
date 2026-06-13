import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ContentPanel } from "./ContentPanel";
import { ContentPanelNavigationProvider, useContentPanelNavigation } from "./contentPanelNavigation";
import { LeftSidePanel } from "./LeftSidePanel";
import { RightSidePanel } from "./RightSidePanel";
import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import type { SettingsTabId } from "../settings/settingsTabs";
import type { ChatMessage, RunViewModel } from "../chat/types";
import { ResizablePanel } from "./ResizablePanel";
import { useSidePanelToggles } from "../hooks/useSidePanelToggles";
import { CommandPalette } from "../command-palette/CommandPalette";
import { CommandPaletteProvider, useCommandPalette } from "../command-palette/CommandPaletteContext";
import { AppShellShortcuts } from "../shortcuts/AppShellShortcuts";
import { registerContentPanelLocalBack } from "../lib/contentPanelLocalBack";
import { showTrafficLights } from "../lib/traffic-lights";
import { isTauriRuntime } from "../lib/tauriRuntime";

const LEFT_SIDE_PANEL_WIDTH_KEY = "backsteros.layout.leftPanelWidth";
const RIGHT_SIDE_PANEL_WIDTH_KEY = "backsteros.layout.rightPanelWidth";
const NARROW_NAVIGATION_QUERY = "(max-width: 960px)";

type RightPanelSession = {
  sessionId: string;
  initialMessages: ChatMessage[];
  initialRuns: Record<string, RunViewModel>;
};

function AppMainShell({
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
  children,
  leftSidePanelOpen,
  rightSidePanelOpen,
  contentPanelSidebarOpen,
  toggleLeftSidePanel,
  closeLeftSidePanel,
  closeRightSidePanel,
  toggleRightSidePanel,
  toggleContentPanelSidebar,
  openRightSidePanel,
}: {
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
  children: ReactNode;
  leftSidePanelOpen: boolean;
  rightSidePanelOpen: boolean;
  contentPanelSidebarOpen: boolean;
  toggleLeftSidePanel: () => void;
  closeLeftSidePanel: () => void;
  closeRightSidePanel: () => void;
  toggleRightSidePanel: () => void;
  toggleContentPanelSidebar: () => void;
  openRightSidePanel: () => void;
}) {
  const { activeLinearDocument, clearActiveVaultDocument, resetProjectsOverview } =
    useContentPanelNavigation();
  const { open: commandPaletteOpen } = useCommandPalette();
  const [leftNavigationOverlayOpen, setLeftNavigationOverlayOpen] = useState(false);
  const [narrowNavigation, setNarrowNavigation] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(NARROW_NAVIGATION_QUERY).matches,
  );
  const leftNavigationOverlayRef = useRef<HTMLDivElement | null>(null);
  const rightPanelOverlayRef = useRef<HTMLDivElement | null>(null);
  const showContentPanelSidebar =
    contentPanelSidebarOpen && activeLinearDocument === null;
  const showFloatingLeftNavigation =
    narrowNavigation && (leftSidePanelOpen || leftNavigationOverlayOpen);
  const showFloatingRightPanel = narrowNavigation && rightSidePanelOpen;

  const handleVaultNavItemChange = useCallback(
    (item: SidebarNavItemId | null) => {
      const reclickingCurrent = item !== null && item === activeVaultNavItem;
      if (item !== activeVaultNavItem || reclickingCurrent) {
        // Reset focused content when moving between nav destinations, and also
        // when re-selecting the current one, so the area opens at its start.
        clearActiveVaultDocument();
        resetProjectsOverview();
      }
      if (reclickingCurrent) {
        // Re-clicking the active nav item sends the user all the way back to the
        // start of that area (e.g. Projects). Toggle through null so the
        // destination panes remount even though the nav id is unchanged.
        onVaultNavItemChange(null);
        window.requestAnimationFrame(() => onVaultNavItemChange(item));
        setLeftNavigationOverlayOpen(false);
        if (narrowNavigation) closeLeftSidePanel();
        return;
      }
      onVaultNavItemChange(item);
      setLeftNavigationOverlayOpen(false);
      if (narrowNavigation) closeLeftSidePanel();
    },
    [
      activeVaultNavItem,
      clearActiveVaultDocument,
      closeLeftSidePanel,
      narrowNavigation,
      onVaultNavItemChange,
      resetProjectsOverview,
    ],
  );

  const handleOpenSettings = useCallback(() => {
    onOpenSettings();
    setLeftNavigationOverlayOpen(false);
    if (narrowNavigation) closeLeftSidePanel();
  }, [closeLeftSidePanel, narrowNavigation, onOpenSettings]);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    showTrafficLights();
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(NARROW_NAVIGATION_QUERY);
    const handleChange = () => {
      setNarrowNavigation(mediaQuery.matches);
      setLeftNavigationOverlayOpen(false);
    };
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!showFloatingLeftNavigation) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        target instanceof Element &&
        target.closest(".content-panel-navigation-toggle")
      ) {
        return;
      }
      if (target && leftNavigationOverlayRef.current?.contains(target)) return;
      setLeftNavigationOverlayOpen(false);
      if (leftSidePanelOpen) closeLeftSidePanel();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLeftNavigationOverlayOpen(false);
        if (leftSidePanelOpen) closeLeftSidePanel();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeLeftSidePanel, leftSidePanelOpen, showFloatingLeftNavigation]);

  useEffect(() => {
    if (!showFloatingRightPanel) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && rightPanelOverlayRef.current?.contains(target)) return;
      closeRightSidePanel();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeRightSidePanel();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeRightSidePanel, showFloatingRightPanel]);

  useEffect(() => {
    return registerContentPanelLocalBack(() => {
      if (showFloatingRightPanel && rightSidePanelOpen) {
        closeRightSidePanel();
        return true;
      }
      if (showFloatingLeftNavigation && leftNavigationOverlayOpen) {
        setLeftNavigationOverlayOpen(false);
        if (leftSidePanelOpen) closeLeftSidePanel();
        return true;
      }
      return false;
    });
  }, [
    closeLeftSidePanel,
    closeRightSidePanel,
    leftNavigationOverlayOpen,
    leftSidePanelOpen,
    rightSidePanelOpen,
    showFloatingLeftNavigation,
    showFloatingRightPanel,
  ]);

  return (
    <div className="app-main-shell">
      <div className="app-window-chrome" aria-hidden="true">
        <div className="app-window-traffic-safe" data-tauri-drag-region={false} />
        <div className="app-window-drag" data-tauri-drag-region />
      </div>
      {!narrowNavigation ? (
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
            settingsOpen={settingsOpen}
            activeSettingsTab={activeSettingsTab}
            onSettingsTabChange={onSettingsTabChange}
            onOpenSettings={handleOpenSettings}
            onExitSettings={onExitSettings}
            savedNotesPath={savedNotesPath}
            activeVaultNavItem={activeVaultNavItem}
            onVaultNavItemChange={handleVaultNavItemChange}
          />
        </ResizablePanel>
      ) : null}

      {showFloatingLeftNavigation ? (
        <div
          ref={leftNavigationOverlayRef}
          className="left-side-panel-floating"
          role="dialog"
          aria-label="Main navigation"
        >
          <LeftSidePanel
            settingsOpen={settingsOpen}
            activeSettingsTab={activeSettingsTab}
            onSettingsTabChange={onSettingsTabChange}
            onOpenSettings={handleOpenSettings}
            onExitSettings={onExitSettings}
            savedNotesPath={savedNotesPath}
            activeVaultNavItem={activeVaultNavItem}
            onVaultNavItemChange={handleVaultNavItemChange}
          />
        </div>
      ) : null}

      <div className="content-panel-slot">
        <ContentPanel
          sidebarOpen={showContentPanelSidebar}
          hideSidebar={settingsOpen || activeVaultNavItem === "projects"}
          activeVaultNavItem={activeVaultNavItem}
          onVaultNavItemChange={handleVaultNavItemChange}
          vaultExplorerEnabled={vaultExplorerEnabled}
          navigationCollapsed={!leftSidePanelOpen && !leftNavigationOverlayOpen}
          onOpenNavigation={() => {
            if (narrowNavigation) {
              setLeftNavigationOverlayOpen((current) => !current);
              return;
            }
            toggleLeftSidePanel();
          }}
          settingsOpen={settingsOpen}
          activeSettingsTab={activeSettingsTab}
        >
          {children}
        </ContentPanel>
      </div>

      {!narrowNavigation ? (
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
            onSaveSessionState={onSaveRightPanelSessionState}
          />
        </ResizablePanel>
      ) : null}

      {showFloatingRightPanel ? (
        <div
          ref={rightPanelOverlayRef}
          className="right-side-panel-floating"
          role="dialog"
          aria-label="Right side panel"
        >
          <RightSidePanel
            chatEnabled={rightPanelChatEnabled}
            session={rightPanelSession}
            sessionLoading={rightPanelSessionLoading}
            onSaveSessionState={onSaveRightPanelSessionState}
          />
        </div>
      ) : null}
      <CommandPalette
        vaultExplorerEnabled={vaultExplorerEnabled}
        onVaultNavItemChange={handleVaultNavItemChange}
        onOpenSettings={handleOpenSettings}
        onSettingsTabChange={onSettingsTabChange}
      />
      <AppShellShortcuts
        settingsOpen={settingsOpen}
        commandPaletteOpen={commandPaletteOpen}
        activeVaultNavItem={activeVaultNavItem}
        onVaultNavItemChange={handleVaultNavItemChange}
        onOpenSettings={handleOpenSettings}
        onSettingsTabChange={onSettingsTabChange}
        onToggleLeftSidePanel={toggleLeftSidePanel}
        onToggleRightSidePanel={toggleRightSidePanel}
        onToggleContentPanelSidebar={toggleContentPanelSidebar}
        onOpenRightSidePanel={openRightSidePanel}
        rightSidePanelOpen={rightSidePanelOpen}
      />
    </div>
  );
}

export function AppShellLayout({
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
  children,
}: {
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
  children: ReactNode;
}) {
  const {
    leftSidePanelOpen,
    rightSidePanelOpen,
    contentPanelSidebarOpen,
    closeLeftSidePanel,
    closeRightSidePanel,
    openRightSidePanel,
    toggleLeftSidePanel,
    toggleRightSidePanel,
    toggleContentPanelSidebar,
  } = useSidePanelToggles();

  return (
    <ContentPanelNavigationProvider>
      <CommandPaletteProvider>
        <AppMainShell
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
        leftSidePanelOpen={leftSidePanelOpen}
        rightSidePanelOpen={rightSidePanelOpen}
        contentPanelSidebarOpen={contentPanelSidebarOpen}
        closeLeftSidePanel={closeLeftSidePanel}
        closeRightSidePanel={closeRightSidePanel}
        toggleLeftSidePanel={toggleLeftSidePanel}
        toggleRightSidePanel={toggleRightSidePanel}
        toggleContentPanelSidebar={toggleContentPanelSidebar}
        openRightSidePanel={openRightSidePanel}
      >
        {children}
      </AppMainShell>
      </CommandPaletteProvider>
    </ContentPanelNavigationProvider>
  );
}
