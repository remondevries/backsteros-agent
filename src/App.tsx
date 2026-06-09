import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppViewRibbon } from "./app/AppViewRibbon";
import { CommandPanel } from "./app/CommandPanel";
import type { AppView } from "./app/appViews";
import { ChatView, type ChatViewHandle } from "./chat/ChatView";
import { SessionTabBar } from "./chat/SessionTabBar";
import type { ModelMode } from "./chat/types";
import { useCommandPanelShortcuts } from "./hooks/useCommandPanelShortcuts";
import { useSessionTabShortcuts } from "./hooks/useSessionTabShortcuts";
import { useSessionTabs } from "./hooks/useSessionTabs";
import { useSystemTheme } from "./hooks/useSystemTheme";
import { SettingsPanel } from "./settings/SettingsPanel";
import { VaultProvider } from "./chat/VaultContext";
import { LinearDashboard } from "./linear/LinearDashboard";
import { ObsidianDashboard } from "./obsidian/ObsidianDashboard";
import { WhoopDashboard } from "./whoop/WhoopDashboard";
import { connectGoogleCalendar, getHealth, getSettings, getWhoopSetup, setSidecarConnection, waitForSidecar } from "./lib/api";
import { setLinearIssueLinkMode } from "./lib/linear/linearLink";
import { openExternalUrl } from "./lib/openExternalUrl";

async function loadTauriConnection() {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const connection = await invoke<{ baseUrl: string; token: string }>("get_sidecar_connection");
    if (connection.token) {
      setSidecarConnection({
        // In dev, route through Vite's /api proxy so the webview does not race the sidecar bind.
        baseUrl: import.meta.env.DEV ? "/api" : connection.baseUrl,
        token: connection.token,
      });
    }
  } catch {
    // Browser dev mode uses Vite proxy defaults.
  }
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [notesPath, setNotesPath] = useState<string | null>(null);
  const [vaultName, setVaultName] = useState<string | null>(null);
  const [defaultNotesPath, setDefaultNotesPath] = useState("");
  const [modelMode, setModelMode] = useState<ModelMode>("auto");
  const [userProfilePath, setUserProfilePath] = useState<string | undefined>();
  const [agentProfilePath, setAgentProfilePath] = useState<string | undefined>();
  const [showSettings, setShowSettings] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [linearWarning, setLinearWarning] = useState<string | null>(null);
  const [calendarWarning, setCalendarWarning] = useState<string | null>(null);
  const [calendarConnecting, setCalendarConnecting] = useState(false);
  const [needsCalendarConnect, setNeedsCalendarConnect] = useState(false);
  const [whoopWarning, setWhoopWarning] = useState<string | null>(null);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [appView, setAppView] = useState<AppView>("chat");
  const [commandPanelOpen, setCommandPanelOpen] = useState(false);
  const activeChatRef = useRef<ChatViewHandle>(null);

  const focusActiveComposer = useCallback(() => {
    activeChatRef.current?.focusComposer();
  }, []);

  const handleAppViewChange = useCallback(
    (nextView: AppView) => {
      setAppView(nextView);
      setCommandPanelOpen(false);
      if (nextView === "chat") {
        focusActiveComposer();
      }
    },
    [focusActiveComposer],
  );

  const chatEnabled = ready && Boolean(notesPath) && !showSettings;
  const {
    tabs,
    activeSessionId,
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

  useSystemTheme();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === ",") {
        event.preventDefault();
        setShowSettings(true);
        return;
      }

    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const commandPanelEnabled = ready && Boolean(notesPath) && !showSettings;

  useCommandPanelShortcuts({
    enabled: commandPanelEnabled,
    commandPanelOpen,
    onOpen: () => setCommandPanelOpen(true),
    onNavigate: handleAppViewChange,
  });

  useEffect(() => {
    void (async () => {
      try {
        await loadTauriConnection();
        await waitForSidecar();

        const health = await getHealth();
        if (!health.hasApiKey) {
          setHealthError("Set CURSOR_API_KEY in ~/.backsteros-agent/.env");
        } else {
          if (!health.hasLinearApiKey) {
            setLinearWarning("Linear MCP is not configured. Add LINEAR_API_KEY to ~/.backsteros-agent/.env.");
          }
          if (!health.hasGoogleCalendarCredentials) {
            setCalendarWarning(
              "Google Calendar MCP is not configured. Add GOOGLE_OAUTH_CREDENTIALS to ~/.backsteros-agent/.env.",
            );
            setNeedsCalendarConnect(false);
          } else if (!health.hasGoogleCalendarAuth) {
            setCalendarWarning(
              "Google Calendar is configured but not linked yet. Connect your Google account in your browser (not inside this window).",
            );
            setNeedsCalendarConnect(true);
          } else {
            setNeedsCalendarConnect(false);
          }
          if (!health.hasWhoopAuth) {
            setWhoopWarning(
              "Whoop is not connected. Add tokens to ~/.backsteros-agent/totem.env after running `npx -y @briangaoo/totem auth`.",
            );
          } else {
            setWhoopWarning(null);
          }
        }

        const settings = await getSettings();
        setNotesPath(settings.notesPath);
        setVaultName(settings.vaultName ?? null);
        setDefaultNotesPath(settings.defaultNotesPath);
        setModelMode(settings.modelMode);
        setLinearIssueLinkMode(settings.issueLinkMode ?? "external");
        setUserProfilePath(settings.userProfilePath);
        setAgentProfilePath(settings.agentProfilePath);
      } catch (err) {
        setHealthError(
          err instanceof Error ? err.message : "Sidecar is not reachable",
        );
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const handleCloseActiveTab = useCallback(async () => {
    if (!activeSessionId || tabs.length <= 1) return;
    await closeTab(activeSessionId);
  }, [activeSessionId, closeTab, tabs.length]);

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
        void newTab();
      },
      onCloseTab: handleCloseActiveTab,
      onRenameTab: () => {
        if (activeSessionId) {
          setRenamingSessionId(activeSessionId);
        }
      },
      onPreviousTab: () => selectRelativeTab(-1),
      onNextTab: () => selectRelativeTab(1),
    }),
    [activeSessionId, handleCloseActiveTab, newTab, selectRelativeTab],
  );

  useSessionTabShortcuts(chatEnabled, shortcutHandlers);

  useEffect(() => {
    if (!chatEnabled || !activeSessionId || appView !== "chat") return;
    focusActiveComposer();
  }, [activeSessionId, appView, chatEnabled, focusActiveComposer]);

  async function handleSettingsUpdated(path: string, nextVaultName?: string | null) {
    setNotesPath(path);
    setVaultName(nextVaultName ?? null);
    setShowSettings(false);
    await reloadTabs();
    focusActiveComposer();
  }

  async function handleConnectGoogleCalendar() {
    setCalendarConnecting(true);
    try {
      const { authUrl } = await connectGoogleCalendar();
      await openExternalUrl(authUrl);

      for (let attempt = 0; attempt < 120; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        const health = await getHealth();
        if (health.hasGoogleCalendarAuth) {
          setCalendarWarning(null);
          setNeedsCalendarConnect(false);
          return;
        }
      }

      setCalendarWarning(
        "Browser sign-in started. Keep BacksterOS Agent open until the success page appears, then return here.",
      );
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
    <div className="app-shell">
      {healthError && <div className="error-banner">{healthError}</div>}
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

      {!notesPath || showSettings ? (
        <SettingsPanel
          notesPath={notesPath}
          vaultName={vaultName}
          defaultNotesPath={defaultNotesPath}
          initialModelMode={modelMode}
          initialUserProfilePath={userProfilePath}
          initialAgentProfilePath={agentProfilePath}
          onUpdated={(path, nextVaultName) => {
            void handleSettingsUpdated(path, nextVaultName);
          }}
        />
      ) : (
        <VaultProvider notesPath={notesPath} vaultNameOverride={vaultName}>
          {commandPanelOpen && (
            <CommandPanel
              activeView={appView}
              onClose={() => setCommandPanelOpen(false)}
              onSelect={handleAppViewChange}
            />
          )}

          <div className="app-main-shell">
            <AppViewRibbon activeView={appView} onChange={handleAppViewChange} />

            <div className="app-content-shell">
              {appView === "chat" && (
                <SessionTabBar
                  tabs={tabs}
                  activeSessionId={activeSessionId}
                  renamingSessionId={renamingSessionId}
                  onSelect={(sessionId) => {
                    selectTab(sessionId);
                    focusActiveComposer();
                  }}
                  onClose={(sessionId) => {
                    void closeTab(sessionId);
                  }}
                  onNewTab={() => {
                    void newTab().then(focusActiveComposer);
                  }}
                  onRenameCommit={handleRenameCommit}
                  onRenameCancel={handleRenameCancel}
                />
              )}

              <div className="chat-views" hidden={appView !== "chat"}>
                {tabsLoading && tabs.length === 0 ? (
                  <div className="app-shell loading">Loading sessions…</div>
                ) : (
                  tabs.map((tab) => (
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

              <div className="app-view-pane" hidden={appView !== "whoop"}>
                <WhoopDashboard />
              </div>

              <div className="app-view-pane" hidden={appView !== "linear"}>
                <LinearDashboard />
              </div>

              <div className="app-view-pane" hidden={appView !== "obsidian"}>
                <ObsidianDashboard />
              </div>
            </div>
          </div>
        </VaultProvider>
      )}
    </div>
  );
}
