import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShellLayout } from "./app/AppShellLayout";
import { LinearWorkspaceContent } from "./app/LinearWorkspaceContent";
import { CommandPanel } from "./app/CommandPanel";
import type { AppView } from "./app/appViews";
import { ChatView, type ChatViewHandle } from "./chat/ChatView";
import { UiPreviewProvider } from "./chat/dev/UiPreviewContext";
import { SessionTabBar } from "./chat/SessionTabBar";
import type { ModelMode } from "./chat/types";
import { useCommandPanelShortcuts } from "./hooks/useCommandPanelShortcuts";
import { useAppViewNavigationShortcuts } from "./hooks/useAppViewNavigationShortcuts";
import { useSessionTabShortcuts } from "./hooks/useSessionTabShortcuts";
import { useLookupSessionTabs } from "./hooks/useLookupSessionTabs";
import { useSessionTabs } from "./hooks/useSessionTabs";
import { useSystemTheme } from "./hooks/useSystemTheme";
import { useRightPanelSession } from "./hooks/useRightPanelSession";
import {
  readPersistedAppView,
  readPersistedSettingsTab,
  readPersistedShowSettings,
  readPersistedVaultNavItem,
  writePersistedAppState,
} from "./hooks/usePersistedAppState";
import type { SidebarNavItemId } from "./lib/sidebarNavItems";
import { LookupView, type LookupViewHandle } from "./lookup/LookupView";
import { SettingsPanel } from "./settings/SettingsPanel";
import type { SettingsTabId } from "./settings/settingsTabs";
import { VaultProvider } from "./chat/VaultContext";
import {
  formatSidecarReachabilityError,
  getHealth,
  getSettings,
  getWhoopSetup,
  invalidateDashboardRequestCache,
  setSidecarConnection,
  waitForSidecar,
} from "./lib/api";
import { connectGoogleCalendarAndWait } from "./lib/googleCalendarConnect";
import { getCalendarStartupWarning } from "./lib/integrationWarnings";
import { isTauriRuntime } from "./lib/tauriRuntime";
import { setLinearIssueLinkMode } from "./lib/linear/linearLink";
import { openExternalUrl } from "./lib/openExternalUrl";

type DashboardView = Extract<AppView, "whoop" | "linear" | "obsidian">;

const DASHBOARD_VIEWS = new Set<DashboardView>(["whoop", "linear", "obsidian"]);

function isDashboardView(view: AppView): view is DashboardView {
  return DASHBOARD_VIEWS.has(view as DashboardView);
}

const WhoopDashboard = lazy(() =>
  import("./whoop/WhoopDashboard").then((module) => ({ default: module.WhoopDashboard })),
);
const LinearDashboard = lazy(() =>
  import("./linear/LinearDashboard").then((module) => ({ default: module.LinearDashboard })),
);
const ObsidianDashboard = lazy(() =>
  import("./obsidian/ObsidianDashboard").then((module) => ({ default: module.ObsidianDashboard })),
);

async function loadTauriConnection() {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const connection = await invoke<{ baseUrl: string; token: string }>("get_sidecar_connection");
    if (connection.token) {
      setSidecarConnection({
        // Tauri talks to the sidecar directly; browser dev keeps the Vite /api proxy.
        baseUrl: connection.baseUrl,
        token: connection.token,
      });
      return true;
    }
  } catch {
    // Browser dev mode uses Vite proxy defaults.
  }
  return false;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [notesPath, setNotesPath] = useState<string | null>(null);
  const [vaultName, setVaultName] = useState<string | null>(null);
  const [defaultNotesPath, setDefaultNotesPath] = useState("");
  const [modelMode, setModelMode] = useState<ModelMode>("auto");
  const [userProfilePath, setUserProfilePath] = useState<string | undefined>();
  const [agentProfilePath, setAgentProfilePath] = useState<string | undefined>();
  const [showSettings, setShowSettings] = useState(() => readPersistedShowSettings());
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTabId>(
    () => readPersistedSettingsTab() ?? "general",
  );
  const [healthError, setHealthError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [linearWarning, setLinearWarning] = useState<string | null>(null);
  const [calendarWarning, setCalendarWarning] = useState<string | null>(null);
  const [calendarConnecting, setCalendarConnecting] = useState(false);
  const [needsCalendarConnect, setNeedsCalendarConnect] = useState(false);
  const [whoopWarning, setWhoopWarning] = useState<string | null>(null);
  const [geminiWarning, setGeminiWarning] = useState<string | null>(null);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renamingLookupSessionId, setRenamingLookupSessionId] = useState<string | null>(null);
  const [appView, setAppView] = useState<AppView>(() => readPersistedAppView() ?? "chat");
  const [activeVaultNavItem, setActiveVaultNavItem] = useState<SidebarNavItemId | null>(
    () => readPersistedVaultNavItem() ?? "inbox",
  );
  const [mountedDashboardViews, setMountedDashboardViews] = useState<Set<DashboardView>>(() => {
    const persistedView = readPersistedAppView();
    if (persistedView && isDashboardView(persistedView)) {
      return new Set([persistedView]);
    }
    return new Set();
  });
  const [commandPanelOpen, setCommandPanelOpen] = useState(false);
  const activeChatRef = useRef<ChatViewHandle>(null);
  const activeLookupRef = useRef<LookupViewHandle>(null);

  const focusActiveComposer = useCallback(() => {
    activeChatRef.current?.focusComposer();
  }, []);

  const focusActiveLookupComposer = useCallback(() => {
    activeLookupRef.current?.focusComposer();
  }, []);

  const handleAppViewChange = useCallback(
    (nextView: AppView) => {
      setAppView(nextView);
      setCommandPanelOpen(false);
      if (nextView === "chat") {
        focusActiveComposer();
      }
      if (nextView === "lookup") {
        focusActiveLookupComposer();
      }
    },
    [focusActiveComposer, focusActiveLookupComposer],
  );

  const chatEnabled = ready && Boolean(notesPath);
  const lookupEnabled = chatEnabled;
  const {
    tabs,
    activeSessionId,
    mountedSessionIds,
    loading: tabsLoading,
    selectTab,
    newTab,
    closeTab,
    selectRelativeTab,
    updateTabTitle,
    renameTab,
    cancelPendingTabStateSave,
    resetTabState,
    saveTabState,
    reloadTabs,
  } = useSessionTabs(chatEnabled);

  const {
    tabs: lookupTabs,
    activeSessionId: activeLookupSessionId,
    mountedSessionIds: mountedLookupSessionIds,
    loading: lookupTabsLoading,
    selectTab: selectLookupTab,
    newTab: newLookupTab,
    closeTab: closeLookupTab,
    selectRelativeTab: selectRelativeLookupTab,
    updateTabTitle: updateLookupTabTitle,
    renameTab: renameLookupTab,
    saveTabState: saveLookupTabState,
  } = useLookupSessionTabs(lookupEnabled);

  const mountedChatSessionIds = useMemo(
    () => new Set(mountedSessionIds),
    [mountedSessionIds],
  );
  const mountedLookupSessionIdSet = useMemo(
    () => new Set(mountedLookupSessionIds),
    [mountedLookupSessionIds],
  );

  const activeSessionTitle = useMemo(() => {
    if (appView === "chat") {
      return tabs.find((tab) => tab.sessionId === activeSessionId)?.title ?? null;
    }
    if (appView === "lookup") {
      return lookupTabs.find((tab) => tab.sessionId === activeLookupSessionId)?.title ?? null;
    }
    return null;
  }, [activeLookupSessionId, activeSessionId, appView, lookupTabs, tabs]);

  useSystemTheme();

  useEffect(() => {
    if (!isDashboardView(appView)) return;
    setMountedDashboardViews((current) => {
      if (current.has(appView)) return current;
      const next = new Set(current);
      next.add(appView);
      return next;
    });
  }, [appView]);

  const settingsMode = !notesPath || showSettings;
  const rightPanelChatEnabled = chatEnabled && !settingsMode;
  const vaultExplorerEnabled = chatEnabled && !settingsMode;
  const {
    session: rightPanelSession,
    loading: rightPanelSessionLoading,
    saveSessionState: saveRightPanelSessionState,
  } = useRightPanelSession(rightPanelChatEnabled);

  useEffect(() => {
    if (!ready || !notesPath) return;
    writePersistedAppState({
      appView,
      showSettings,
      activeSettingsTab,
      activeVaultNavItem: activeVaultNavItem ?? undefined,
    });
  }, [activeSettingsTab, activeVaultNavItem, appView, notesPath, ready, showSettings]);

  const handleOpenSettings = useCallback(() => {
    setActiveSettingsTab("general");
    setShowSettings(true);
  }, []);

  const handleExitSettings = useCallback(() => {
    if (!notesPath) return;
    setShowSettings(false);
    window.requestAnimationFrame(() => focusActiveComposer());
  }, [focusActiveComposer, notesPath]);

  const handleToggleSettings = useCallback(() => {
    if (!notesPath) return;
    setShowSettings((open) => {
      if (open) {
        window.requestAnimationFrame(() => focusActiveComposer());
        return false;
      }
      setActiveSettingsTab("general");
      return true;
    });
  }, [focusActiveComposer, notesPath]);

  useEffect(() => {
    if (!notesPath && ready) {
      setActiveSettingsTab("obsidian");
    }
  }, [notesPath, ready]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === ",") {
        event.preventDefault();
        handleToggleSettings();
        return;
      }

      if (event.key === "Escape" && showSettings && notesPath) {
        event.preventDefault();
        handleExitSettings();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleExitSettings, handleToggleSettings, notesPath, showSettings]);

  const commandPanelEnabled = ready && Boolean(notesPath);

  useCommandPanelShortcuts({
    enabled: commandPanelEnabled,
    commandPanelOpen,
    onOpen: () => setCommandPanelOpen(true),
    onNavigate: handleAppViewChange,
  });

  useAppViewNavigationShortcuts({
    enabled: commandPanelEnabled,
    activeView: appView,
    onNavigate: handleAppViewChange,
  });

  const connectToSidecar = useCallback(async () => {
    setConnecting(true);
    setHealthError(null);
    invalidateDashboardRequestCache();

    try {
      const usingTauri = await loadTauriConnection();
      await waitForSidecar({
        retries: usingTauri || isTauriRuntime() ? 12 : 60,
        delayMs: 200,
        healthTimeoutMs: usingTauri || isTauriRuntime() ? 2_000 : 8_000,
      });

      const [health, settings] = await Promise.all([getHealth({ force: true }), getSettings()]);
      if (!health.hasApiKey) {
        setHealthError("Add your Cursor API key in Settings → Cursor.");
        return;
      }

      if (!health.hasGeminiApiKey) {
        setGeminiWarning(
          "Gemini Lookup is not configured. Add GEMINI_API_KEY to ~/.backsteros-agent/.env.",
        );
      } else {
        setGeminiWarning(null);
      }
      if (!health.hasLinearApiKey) {
        setLinearWarning("Linear MCP is not configured. Add LINEAR_API_KEY to ~/.backsteros-agent/.env.");
      } else {
        setLinearWarning(null);
      }
      const calendarWarningState = getCalendarStartupWarning(health);
      setCalendarWarning(calendarWarningState.message);
      setNeedsCalendarConnect(calendarWarningState.needsConnect);
      if (!health.hasWhoopAuth) {
        setWhoopWarning(
          "Whoop is not connected. Add tokens to ~/.backsteros-agent/totem.env after running `npx -y @briangaoo/totem auth`.",
        );
      } else {
        setWhoopWarning(null);
      }

      setNotesPath(settings.notesPath);
      setVaultName(settings.vaultName ?? null);
      setDefaultNotesPath(settings.defaultNotesPath);
      setModelMode(settings.modelMode);
      setLinearIssueLinkMode(settings.issueLinkMode ?? "external");
      setUserProfilePath(settings.userProfilePath);
      setAgentProfilePath(settings.agentProfilePath);
    } catch (err) {
      setHealthError(formatSidecarReachabilityError(err));
    } finally {
      setConnecting(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await connectToSidecar();
      setReady(true);
    })();
  }, [connectToSidecar]);

  const handleCloseActiveTab = useCallback(async () => {
    if (appView === "lookup") {
      if (!activeLookupSessionId || lookupTabs.length <= 1) return;
      await closeLookupTab(activeLookupSessionId);
      return;
    }
    if (!activeSessionId || tabs.length <= 1) return;
    await closeTab(activeSessionId);
  }, [
    activeLookupSessionId,
    activeSessionId,
    appView,
    closeLookupTab,
    closeTab,
    lookupTabs.length,
    tabs.length,
  ]);

  const handleRenameCommit = useCallback(
    (sessionId: string, title: string) => {
      renameTab(sessionId, title);
      setRenamingSessionId(null);
      focusActiveComposer();
    },
    [focusActiveComposer, renameTab],
  );

  const handleRenameCancel = useCallback(() => {
    setRenamingSessionId(null);
    focusActiveComposer();
  }, [focusActiveComposer]);

  useEffect(() => {
    setRenamingSessionId((current) =>
      current && current !== activeSessionId ? null : current,
    );
  }, [activeSessionId]);

  const shortcutHandlers = useMemo(
    () => ({
      onNewTab: () => {
        if (appView === "lookup") {
          void newLookupTab().then(focusActiveLookupComposer);
          return;
        }
        void newTab();
      },
      onCloseTab: handleCloseActiveTab,
      onRenameTab: () => {
        if (appView === "lookup") {
          if (activeLookupSessionId) {
            setRenamingLookupSessionId(activeLookupSessionId);
          }
          return;
        }
        if (activeSessionId) {
          setRenamingSessionId(activeSessionId);
        }
      },
      onPreviousTab: () => {
        if (appView === "lookup") {
          selectRelativeLookupTab(-1);
          return;
        }
        selectRelativeTab(-1);
      },
      onNextTab: () => {
        if (appView === "lookup") {
          selectRelativeLookupTab(1);
          return;
        }
        selectRelativeTab(1);
      },
    }),
    [
      activeLookupSessionId,
      activeSessionId,
      appView,
      focusActiveLookupComposer,
      handleCloseActiveTab,
      newLookupTab,
      newTab,
      selectRelativeLookupTab,
      selectRelativeTab,
    ],
  );

  useSessionTabShortcuts(chatEnabled, shortcutHandlers);

  useEffect(() => {
    if (!chatEnabled || !activeSessionId || appView !== "chat") return;
    focusActiveComposer();
  }, [activeSessionId, appView, chatEnabled, focusActiveComposer]);

  useEffect(() => {
    if (!lookupEnabled || !activeLookupSessionId || appView !== "lookup") return;
    focusActiveLookupComposer();
  }, [activeLookupSessionId, appView, focusActiveLookupComposer, lookupEnabled]);

  useEffect(() => {
    setRenamingLookupSessionId((current) =>
      current && current !== activeLookupSessionId ? null : current,
    );
  }, [activeLookupSessionId]);

  async function handleSettingsUpdated(path: string, nextVaultName?: string | null) {
    setNotesPath(path);
    setVaultName(nextVaultName ?? null);
    await reloadTabs();
  }

  async function handleConnectGoogleCalendar() {
    setCalendarConnecting(true);
    try {
      const result = await connectGoogleCalendarAndWait();
      if (result.connected) {
        setCalendarWarning(null);
        setNeedsCalendarConnect(false);
        return;
      }
      if (result.message) {
        setCalendarWarning(result.message);
      }
    } catch (error) {
      setCalendarWarning(
        error instanceof Error ? error.message : "Failed to start Google Calendar sign-in",
      );
    } finally {
      setCalendarConnecting(false);
    }
  }

  async function handleWhoopSetup() {
    try {
      const setup = await getWhoopSetup();
      const instructions = [
        `Tokens file: ${setup.envPath}`,
        "",
        "1. Add WHOOP_EMAIL=your@email.com to that file",
        `2. Run in Terminal: ${setup.authCommand}`,
        "3. Copy WHOOP_IOS_BEARER_TOKEN, WHOOP_COGNITO_REFRESH_TOKEN, WHOOP_USER_ID, and WHOOP_INSTALLATION_ID into totem.env",
        "4. Restart BacksterOS Agent or send a Whoop message to verify",
      ].join("\n");
      await navigator.clipboard.writeText(instructions);
      await openExternalUrl(setup.docsUrl);
      setWhoopWarning("Setup steps copied to clipboard. Finish auth in Terminal, paste tokens into totem.env, then restart the app.");
    } catch (error) {
      setWhoopWarning(error instanceof Error ? error.message : "Failed to load Whoop setup info");
    }
  }

  if (!ready) {
    return <div className="app-shell loading">Starting BacksterOS Agent…</div>;
  }

  return (
    <UiPreviewProvider>
    <div className="app-shell">
      {healthError && (
        <div className="warning-banner">
          <span>{healthError}</span>
          <button
            type="button"
            className="warning-banner-action"
            disabled={connecting}
            onClick={() => {
              void connectToSidecar();
            }}
          >
            {connecting ? "Connecting…" : "Retry connection"}
          </button>
        </div>
      )}
      {!healthError && linearWarning && <div className="warning-banner">{linearWarning}</div>}
      {!healthError && calendarWarning && (
        <div className="warning-banner">
          <span>{calendarWarning}</span>
          {needsCalendarConnect && (
            <button
              type="button"
              className="warning-banner-action"
              disabled={calendarConnecting}
              onClick={() => {
                void handleConnectGoogleCalendar();
              }}
            >
              {calendarConnecting ? "Opening browser…" : "Connect Google Calendar"}
            </button>
          )}
        </div>
      )}
      {!healthError && whoopWarning && (
        <div className="warning-banner">
          <span>{whoopWarning}</span>
          <button
            type="button"
            className="warning-banner-action"
            onClick={() => {
              void handleWhoopSetup();
            }}
          >
            Whoop setup
          </button>
        </div>
      )}
      {!healthError && geminiWarning && appView === "lookup" && (
        <div className="warning-banner">{geminiWarning}</div>
      )}

      {notesPath ? (
        <VaultProvider notesPath={notesPath} vaultNameOverride={vaultName}>
          {commandPanelOpen && (
            <CommandPanel
              activeView={appView}
              onClose={() => setCommandPanelOpen(false)}
              onSelect={handleAppViewChange}
            />
          )}

          <AppShellLayout
            activeView={appView}
            onViewChange={handleAppViewChange}
            settingsOpen={settingsMode}
            activeSettingsTab={activeSettingsTab}
            onSettingsTabChange={setActiveSettingsTab}
            onOpenSettings={handleOpenSettings}
            onExitSettings={handleExitSettings}
            savedNotesPath={notesPath}
            rightPanelChatEnabled={rightPanelChatEnabled}
            rightPanelSession={rightPanelSession}
            rightPanelSessionLoading={rightPanelSessionLoading}
            onSaveRightPanelSessionState={saveRightPanelSessionState}
            activeVaultNavItem={activeVaultNavItem}
            onVaultNavItemChange={setActiveVaultNavItem}
            vaultExplorerEnabled={vaultExplorerEnabled}
            activeSessionTitle={activeSessionTitle}
          >
            {settingsMode ? (
              <SettingsPanel
                activeTab={activeSettingsTab}
                notesPath={notesPath}
                vaultName={vaultName}
                defaultNotesPath={defaultNotesPath}
                initialModelMode={modelMode}
                initialUserProfilePath={userProfilePath}
                initialAgentProfilePath={agentProfilePath}
                onSecretsUpdated={() => connectToSidecar()}
                onUpdated={(path, nextVaultName) => {
                  void handleSettingsUpdated(path, nextVaultName);
                }}
              />
            ) : activeVaultNavItem === "projects" ? (
              <LinearWorkspaceContent vaultStructureEnabled={vaultExplorerEnabled} />
            ) : (
              <>
              {(appView === "chat" || appView === "lookup") && (
                <SessionTabBar
                  tabs={appView === "lookup" ? lookupTabs : tabs}
                  activeSessionId={
                    appView === "lookup" ? activeLookupSessionId : activeSessionId
                  }
                  renamingSessionId={
                    appView === "lookup" ? renamingLookupSessionId : renamingSessionId
                  }
                  onSelect={(sessionId) => {
                    if (appView === "lookup") {
                      selectLookupTab(sessionId);
                      focusActiveLookupComposer();
                      return;
                    }
                    selectTab(sessionId);
                    focusActiveComposer();
                  }}
                  onClose={(sessionId) => {
                    if (appView === "lookup") {
                      void closeLookupTab(sessionId);
                      return;
                    }
                    void closeTab(sessionId);
                  }}
                  onNewTab={() => {
                    if (appView === "lookup") {
                      void newLookupTab().then(focusActiveLookupComposer);
                      return;
                    }
                    void newTab().then(focusActiveComposer);
                  }}
                  onRenameCommit={(sessionId, title) => {
                    if (appView === "lookup") {
                      renameLookupTab(sessionId, title);
                      setRenamingLookupSessionId(null);
                      focusActiveLookupComposer();
                      return;
                    }
                    handleRenameCommit(sessionId, title);
                  }}
                  onRenameCancel={() => {
                    if (appView === "lookup") {
                      setRenamingLookupSessionId(null);
                      focusActiveLookupComposer();
                      return;
                    }
                    handleRenameCancel();
                  }}
                />
              )}

              <div className="chat-views" hidden={appView !== "chat"}>
                {tabsLoading && tabs.length === 0 ? (
                  <div className="app-shell loading">Loading sessions…</div>
                ) : (
                  tabs
                    .filter((tab) => mountedChatSessionIds.has(tab.sessionId))
                    .map((tab) => (
                    <div
                      key={tab.sessionId}
                      className={`chat-view-pane ${tab.sessionId === activeSessionId ? "chat-view-pane-active" : ""}`}
                      hidden={tab.sessionId !== activeSessionId}
                    >
                      <ChatView
                        ref={tab.sessionId === activeSessionId ? activeChatRef : undefined}
                        sessionId={tab.sessionId}
                        isActive={tab.sessionId === activeSessionId && appView === "chat"}
                        initialMessages={tab.initialMessages}
                        initialRuns={tab.initialRuns}
                        onBeforeSessionClear={() => cancelPendingTabStateSave(tab.sessionId)}
                        onTitleChange={(title) => updateTabTitle(tab.sessionId, title)}
                        onStateChange={(messages, runs) =>
                          saveTabState(tab.sessionId, messages, runs)
                        }
                        onSessionClear={(title) => {
                          void resetTabState(tab.sessionId);
                          renameTab(tab.sessionId, title);
                        }}
                        onNavigateToView={handleAppViewChange}
                      />
                    </div>
                  ))
                )}
              </div>

              <div className="chat-views" hidden={appView !== "lookup"}>
                {lookupTabsLoading && lookupTabs.length === 0 ? (
                  <div className="app-shell loading">Loading lookup sessions…</div>
                ) : (
                  lookupTabs
                    .filter((tab) => mountedLookupSessionIdSet.has(tab.sessionId))
                    .map((tab) => (
                    <div
                      key={tab.sessionId}
                      className={`chat-view-pane ${tab.sessionId === activeLookupSessionId ? "chat-view-pane-active" : ""}`}
                      hidden={tab.sessionId !== activeLookupSessionId}
                    >
                      <LookupView
                        ref={
                          tab.sessionId === activeLookupSessionId ? activeLookupRef : undefined
                        }
                        sessionId={tab.sessionId}
                        isActive={tab.sessionId === activeLookupSessionId && appView === "lookup"}
                        initialMessages={tab.initialMessages}
                        initialRuns={tab.initialRuns}
                        onTitleChange={(title) => updateLookupTabTitle(tab.sessionId, title)}
                        onStateChange={(messages, runs) =>
                          saveLookupTabState(tab.sessionId, messages, runs)
                        }
                      />
                    </div>
                  ))
                )}
              </div>

              {mountedDashboardViews.has("whoop") ? (
                <div className="app-view-pane" hidden={appView !== "whoop"}>
                  <Suspense fallback={<div className="app-shell loading">Loading Whoop…</div>}>
                    <WhoopDashboard isActive={appView === "whoop"} />
                  </Suspense>
                </div>
              ) : null}

              {mountedDashboardViews.has("linear") ? (
                <div className="app-view-pane" hidden={appView !== "linear"}>
                  <Suspense fallback={<div className="app-shell loading">Loading Linear…</div>}>
                    <LinearDashboard isActive={appView === "linear"} />
                  </Suspense>
                </div>
              ) : null}

              {mountedDashboardViews.has("obsidian") ? (
                <div className="app-view-pane" hidden={appView !== "obsidian"}>
                  <Suspense fallback={<div className="app-shell loading">Loading vault…</div>}>
                    <ObsidianDashboard />
                  </Suspense>
                </div>
              ) : null}
              </>
            )}
          </AppShellLayout>
        </VaultProvider>
      ) : (
        <AppShellLayout
          activeView={appView}
          onViewChange={handleAppViewChange}
          settingsOpen
          activeSettingsTab={activeSettingsTab}
          onSettingsTabChange={setActiveSettingsTab}
          onOpenSettings={handleOpenSettings}
          savedNotesPath={null}
          rightPanelChatEnabled={false}
          rightPanelSession={null}
          rightPanelSessionLoading={false}
          onSaveRightPanelSessionState={() => undefined}
          activeVaultNavItem={null}
          onVaultNavItemChange={() => undefined}
          vaultExplorerEnabled={false}
          activeSessionTitle={null}
        >
          <SettingsPanel
            activeTab={activeSettingsTab}
            notesPath={null}
            vaultName={vaultName}
            defaultNotesPath={defaultNotesPath}
            initialModelMode={modelMode}
            initialUserProfilePath={userProfilePath}
            initialAgentProfilePath={agentProfilePath}
            onSecretsUpdated={() => connectToSidecar()}
            onUpdated={(path, nextVaultName) => {
              void handleSettingsUpdated(path, nextVaultName);
            }}
          />
        </AppShellLayout>
      )}
    </div>
    </UiPreviewProvider>
  );
}
