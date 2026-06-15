import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { AppUrlSync } from "./AppUrlSync";
import { AppShellShortcuts } from "../shortcuts/AppShellShortcuts";
import { isIosDevice } from "../platform/iosStandalone";
import {
  beginIosNavAreaRestore,
  clearIosNavAreaSnapshot,
  endIosNavAreaRestore,
  readIosNavAreaSnapshot,
  saveIosNavAreaSnapshot,
} from "../lib/iosNavAreaMemory";
import { registerContentPanelLocalBack } from "../lib/contentPanelLocalBack";
import { isLetterComposeDraftDocumentId } from "../lib/letterComposeDraft";
import { showTrafficLights } from "../platform/trafficLights";
import { isTauriRuntime } from "../platform/runtime";
import { IosMobileBottomNav } from "./IosMobileBottomNav";

const LETTER_COMPOSE_CHAT_BLOCKED_MESSAGE =
  "The assistant is unavailable while you upload a letter.";

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
  inboxLinearTeamId,
  dailyLinearTeamId,
  workoutsLinearTeamId,
  lettersLinearTeamId,
  knowledgeBaseLinearTeamId,
  addressbookLinearTeamId,
  rightPanelChatEnabled,
  rightPanelSession,
  rightPanelSessionLoading,
  onSaveRightPanelSessionState,
  activeVaultNavItem,
  onVaultNavItemChange,
  linearWorkspaceEnabled,
  vaultExplorerEnabled,
  linearUserId,
  urlSyncEnabled,
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
  inboxLinearTeamId: string | null;
  dailyLinearTeamId: string | null;
  workoutsLinearTeamId: string | null;
  lettersLinearTeamId: string | null;
  knowledgeBaseLinearTeamId: string | null;
  addressbookLinearTeamId: string | null;
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
  linearWorkspaceEnabled: boolean;
  vaultExplorerEnabled: boolean;
  linearUserId: string | null;
  urlSyncEnabled: boolean;
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
  const {
    activeLinearDocument,
    clearActiveVaultDocument,
    resetProjectsOverview,
    captureNavAreaContentSnapshot,
    restoreContentPanelTabSnapshot,
    resetNavAreaContent,
  } = useContentPanelNavigation();
  const { open: commandPaletteOpen } = useCommandPalette();
  const letterComposeActive =
    activeLinearDocument != null &&
    isLetterComposeDraftDocumentId(activeLinearDocument.id);
  const rightPanelChatBlockedMessage = letterComposeActive
    ? LETTER_COMPOSE_CHAT_BLOCKED_MESSAGE
    : null;
  const [leftNavigationOverlayOpen, setLeftNavigationOverlayOpen] = useState(false);
  const [narrowNavigation, setNarrowNavigation] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(NARROW_NAVIGATION_QUERY).matches,
  );
  const leftNavigationOverlayRef = useRef<HTMLDivElement | null>(null);
  const rightPanelOverlayRef = useRef<HTMLDivElement | null>(null);
  const showContentPanelSidebar = contentPanelSidebarOpen;
  const showFloatingLeftNavigation =
    narrowNavigation && (leftSidePanelOpen || leftNavigationOverlayOpen);
  const showFloatingRightPanel = narrowNavigation && rightSidePanelOpen;
  const linearSidebarTeamConfig = useMemo(
    () => ({
      inboxLinearTeamId,
      dailyLinearTeamId,
      workoutsLinearTeamId,
      lettersLinearTeamId,
      knowledgeBaseLinearTeamId,
      addressbookLinearTeamId,
    }),
    [
      addressbookLinearTeamId,
      dailyLinearTeamId,
      inboxLinearTeamId,
      knowledgeBaseLinearTeamId,
      lettersLinearTeamId,
      workoutsLinearTeamId,
    ],
  );

  const restoreIosNavArea = useCallback(
    (item: SidebarNavItemId) => {
      const saved = readIosNavAreaSnapshot(item);
      beginIosNavAreaRestore();
      if (saved) {
        restoreContentPanelTabSnapshot(saved);
      } else {
        resetNavAreaContent();
      }
      window.requestAnimationFrame(() => endIosNavAreaRestore());
    },
    [resetNavAreaContent, restoreContentPanelTabSnapshot],
  );

  const handleVaultNavItemChange = useCallback(
    (item: SidebarNavItemId | null) => {
      const reclickingCurrent = item !== null && item === activeVaultNavItem;
      const iosMemory = isIosDevice();

      if (reclickingCurrent) {
        if (iosMemory && item) {
          clearIosNavAreaSnapshot(item);
        }
        clearActiveVaultDocument();
        resetProjectsOverview();
        onVaultNavItemChange(null);
        window.requestAnimationFrame(() => onVaultNavItemChange(item));
        setLeftNavigationOverlayOpen(false);
        if (narrowNavigation) closeLeftSidePanel();
        return;
      }

      if (item !== activeVaultNavItem) {
        if (iosMemory && activeVaultNavItem) {
          saveIosNavAreaSnapshot(activeVaultNavItem, captureNavAreaContentSnapshot());
        }

        if (!iosMemory) {
          clearActiveVaultDocument();
          resetProjectsOverview();
        }

        onVaultNavItemChange(item);

        if (iosMemory && item) {
          restoreIosNavArea(item);
        }
      } else {
        onVaultNavItemChange(item);
      }

      setLeftNavigationOverlayOpen(false);
      if (narrowNavigation) closeLeftSidePanel();
    },
    [
      activeVaultNavItem,
      captureNavAreaContentSnapshot,
      clearActiveVaultDocument,
      closeLeftSidePanel,
      narrowNavigation,
      onVaultNavItemChange,
      resetProjectsOverview,
      restoreIosNavArea,
    ],
  );

  const handleOpenSettings = useCallback(() => {
    onOpenSettings();
    setLeftNavigationOverlayOpen(false);
    if (narrowNavigation) closeLeftSidePanel();
  }, [closeLeftSidePanel, narrowNavigation, onOpenSettings]);

  const switchVaultNavItemQuiet = useCallback(
    (item: SidebarNavItemId) => {
      if (item === activeVaultNavItem) return;

      if (isIosDevice()) {
        if (activeVaultNavItem) {
          saveIosNavAreaSnapshot(activeVaultNavItem, captureNavAreaContentSnapshot());
        }
        onVaultNavItemChange(item);
        restoreIosNavArea(item);
      } else {
        onVaultNavItemChange(item);
      }

      setLeftNavigationOverlayOpen(false);
      if (narrowNavigation) closeLeftSidePanel();
    },
    [
      activeVaultNavItem,
      captureNavAreaContentSnapshot,
      closeLeftSidePanel,
      narrowNavigation,
      onVaultNavItemChange,
      restoreIosNavArea,
    ],
  );

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
    if (letterComposeActive && rightSidePanelOpen) {
      closeRightSidePanel();
    }
  }, [closeRightSidePanel, letterComposeActive, rightSidePanelOpen]);

  const handleToggleRightSidePanel = useCallback(() => {
    if (letterComposeActive) return;
    toggleRightSidePanel();
  }, [letterComposeActive, toggleRightSidePanel]);

  const handleOpenRightSidePanel = useCallback(() => {
    if (letterComposeActive) return;
    openRightSidePanel();
  }, [letterComposeActive, openRightSidePanel]);

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

  const handleShowSettingsFromUrl = useCallback(
    (open: boolean) => {
      if (open) {
        handleOpenSettings();
        return;
      }
      onExitSettings?.();
    },
    [handleOpenSettings, onExitSettings],
  );

  return (
    <div className="app-main-shell">
      <AppUrlSync
        enabled={urlSyncEnabled}
        linearUserId={linearUserId}
        showSettings={settingsOpen}
        onShowSettingsChange={handleShowSettingsFromUrl}
        activeSettingsTab={activeSettingsTab}
        onSettingsTabChange={onSettingsTabChange}
        activeVaultNavItem={activeVaultNavItem}
        onVaultNavItemChange={switchVaultNavItemQuiet}
      />
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
            inboxLinearTeamId={inboxLinearTeamId}
            dailyLinearTeamId={dailyLinearTeamId}
            workoutsLinearTeamId={workoutsLinearTeamId}
            lettersLinearTeamId={lettersLinearTeamId}
            knowledgeBaseLinearTeamId={knowledgeBaseLinearTeamId}
            addressbookLinearTeamId={addressbookLinearTeamId}
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
            inboxLinearTeamId={inboxLinearTeamId}
            dailyLinearTeamId={dailyLinearTeamId}
            workoutsLinearTeamId={workoutsLinearTeamId}
            lettersLinearTeamId={lettersLinearTeamId}
            knowledgeBaseLinearTeamId={knowledgeBaseLinearTeamId}
            addressbookLinearTeamId={addressbookLinearTeamId}
            activeVaultNavItem={activeVaultNavItem}
            onVaultNavItemChange={handleVaultNavItemChange}
          />
        </div>
      ) : null}

      <div className="content-panel-slot">
        <ContentPanel
          sidebarOpen={showContentPanelSidebar}
          hideSidebar={
            settingsOpen ||
            activeVaultNavItem === "workouts" ||
            (activeVaultNavItem === "projects" && !isIosDevice())
          }
          activeVaultNavItem={activeVaultNavItem}
          onVaultNavItemChange={handleVaultNavItemChange}
          inboxLinearTeamId={inboxLinearTeamId}
          dailyLinearTeamId={dailyLinearTeamId}
          workoutsLinearTeamId={workoutsLinearTeamId}
          lettersLinearTeamId={lettersLinearTeamId}
            knowledgeBaseLinearTeamId={knowledgeBaseLinearTeamId}
            addressbookLinearTeamId={addressbookLinearTeamId}
            linearWorkspaceEnabled={linearWorkspaceEnabled}
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
          defaultWidth={320}
          minWidth={320}
          maxWidth={480}
          ariaLabel="Right side panel"
          collapsed={!rightSidePanelOpen}
        >
          <RightSidePanel
            chatEnabled={rightPanelChatEnabled}
            chatBlockedMessage={rightPanelChatBlockedMessage}
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
            chatBlockedMessage={rightPanelChatBlockedMessage}
            session={rightPanelSession}
            sessionLoading={rightPanelSessionLoading}
            onSaveSessionState={onSaveRightPanelSessionState}
          />
        </div>
      ) : null}
      <CommandPalette
        vaultExplorerEnabled={vaultExplorerEnabled}
        activeVaultNavItem={activeVaultNavItem}
        linearSidebarTeamConfig={linearSidebarTeamConfig}
        settingsOpen={settingsOpen}
        onVaultNavItemChange={handleVaultNavItemChange}
        onVaultNavItemChangeQuiet={switchVaultNavItemQuiet}
        onOpenSettings={handleOpenSettings}
        onSettingsTabChange={onSettingsTabChange}
      />
      <AppShellShortcuts
        settingsOpen={settingsOpen}
        commandPaletteOpen={commandPaletteOpen}
        linearSidebarTeamConfig={linearSidebarTeamConfig}
        activeVaultNavItem={activeVaultNavItem}
        onVaultNavItemChange={handleVaultNavItemChange}
        onOpenSettings={handleOpenSettings}
        onSettingsTabChange={onSettingsTabChange}
        onToggleLeftSidePanel={toggleLeftSidePanel}
        onToggleRightSidePanel={handleToggleRightSidePanel}
        onToggleContentPanelSidebar={toggleContentPanelSidebar}
        onOpenRightSidePanel={handleOpenRightSidePanel}
        rightSidePanelOpen={rightSidePanelOpen}
        rightPanelChatBlocked={letterComposeActive}
      />
      <IosMobileBottomNav
        activeVaultNavItem={activeVaultNavItem}
        onVaultNavItemChange={handleVaultNavItemChange}
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
  inboxLinearTeamId,
  dailyLinearTeamId,
  workoutsLinearTeamId,
  lettersLinearTeamId,
  knowledgeBaseLinearTeamId,
  addressbookLinearTeamId,
  rightPanelChatEnabled,
  rightPanelSession,
  rightPanelSessionLoading,
  onSaveRightPanelSessionState,
  activeVaultNavItem,
  onVaultNavItemChange,
  linearWorkspaceEnabled,
  vaultExplorerEnabled,
  linearUserId,
  urlSyncEnabled,
  children,
}: {
  settingsOpen: boolean;
  activeSettingsTab: SettingsTabId;
  onSettingsTabChange: (tab: SettingsTabId) => void;
  onOpenSettings: () => void;
  onExitSettings?: () => void;
  inboxLinearTeamId: string | null;
  dailyLinearTeamId: string | null;
  workoutsLinearTeamId: string | null;
  lettersLinearTeamId: string | null;
  knowledgeBaseLinearTeamId: string | null;
  addressbookLinearTeamId: string | null;
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
  linearWorkspaceEnabled: boolean;
  vaultExplorerEnabled: boolean;
  linearUserId: string | null;
  urlSyncEnabled: boolean;
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
        inboxLinearTeamId={inboxLinearTeamId}
        dailyLinearTeamId={dailyLinearTeamId}
        workoutsLinearTeamId={workoutsLinearTeamId}
        lettersLinearTeamId={lettersLinearTeamId}
        knowledgeBaseLinearTeamId={knowledgeBaseLinearTeamId}
        addressbookLinearTeamId={addressbookLinearTeamId}
        rightPanelChatEnabled={rightPanelChatEnabled}
        rightPanelSession={rightPanelSession}
        rightPanelSessionLoading={rightPanelSessionLoading}
        onSaveRightPanelSessionState={onSaveRightPanelSessionState}
        activeVaultNavItem={activeVaultNavItem}
        onVaultNavItemChange={onVaultNavItemChange}
        linearWorkspaceEnabled={linearWorkspaceEnabled}
        vaultExplorerEnabled={vaultExplorerEnabled}
        linearUserId={linearUserId}
        urlSyncEnabled={urlSyncEnabled}
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
