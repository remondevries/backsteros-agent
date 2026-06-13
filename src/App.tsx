import { useCallback, useEffect, useRef, useState } from "react";
import { AppShellLayout } from "./app/AppShellLayout";
import { UiPreviewProvider } from "./chat/dev/UiPreviewContext";
import { NotificationProvider } from "./app/notifications/NotificationProvider";
import { subscribeToLinearWatcherEvents } from "./lib/linearWatcherEvents";
import { startLinearIssueAgentDispatch } from "./lib/linearIssueAgentDispatch";
import { LinearIssueAgentDispatchHost } from "./app/project-issues/LinearIssueAgentDispatchHost";
import type { ModelMode } from "./chat/types";
import { useSystemTheme } from "./hooks/useSystemTheme";
import { useRightPanelSession } from "./hooks/useRightPanelSession";
import {
  readPersistedSettingsTab,
  readPersistedShowSettings,
  readPersistedVaultNavItem,
  writePersistedAppState,
} from "./hooks/usePersistedAppState";
import type { SidebarNavItemId } from "./lib/sidebarNavItems";
import { SettingsPanel } from "./settings/SettingsPanel";
import type { SettingsTabId } from "./settings/settingsTabs";
import { VaultProvider } from "./chat/VaultContext";
import {
  formatSidecarReachabilityError,
  getHealth,
  getSettings,
  getWhoopSetup,
  ensureVaultDailyNoteToday,
  invalidateDashboardRequestCache,
  setSidecarConnection,
  waitForSidecar,
} from "./lib/api";
import { connectGoogleCalendarAndWait } from "./lib/googleCalendarConnect";
import { getCalendarStartupWarning } from "./lib/integrationWarnings";
import { isTauriRuntime } from "./lib/tauriRuntime";
import { setLinearIssueLinkMode } from "./lib/linear/linearLink";
import { pushNotification } from "./lib/notifications";
import { openExternalUrl } from "./lib/openExternalUrl";

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
  const [activeVaultNavItem, setActiveVaultNavItem] = useState<SidebarNavItemId | null>(
    () => readPersistedVaultNavItem() ?? "inbox",
  );
  const sidecarBuildSignatureRef = useRef<string | null>(null);
  const sidecarBuildSignatureInitializedRef = useRef(false);

  const chatEnabled = ready && Boolean(notesPath);

  useSystemTheme();

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
      appView: "chat",
      showSettings,
      activeSettingsTab,
      activeVaultNavItem: activeVaultNavItem ?? undefined,
    });
  }, [activeSettingsTab, activeVaultNavItem, notesPath, ready, showSettings]);

  const handleOpenSettings = useCallback(() => {
    setActiveSettingsTab("general");
    setShowSettings(true);
  }, []);

  const handleExitSettings = useCallback(() => {
    if (!notesPath) return;
    setShowSettings(false);
  }, [notesPath]);

  const handleToggleSettings = useCallback(() => {
    if (!notesPath) return;
    setShowSettings((open) => {
      if (open) {
        return false;
      }
      setActiveSettingsTab("general");
      return true;
    });
  }, [notesPath]);

  useEffect(() => {
    if (!notesPath && ready) {
      setActiveSettingsTab("general");
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

      const [health, settings] = await Promise.all([getHealth(), getSettings()]);
      if (!health.hasApiKey) {
        setHealthError("Add your Cursor API key in Settings → Cursor.");
        return;
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

      if (settings.notesPath) {
        try {
          await ensureVaultDailyNoteToday();
        } catch {
          // Best-effort — vault may be temporarily unavailable.
        }
      }
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

  useEffect(() => {
    if (!ready) return;
    return subscribeToLinearWatcherEvents();
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    return startLinearIssueAgentDispatch();
  }, [ready]);

  useEffect(() => {
    if (!ready || import.meta.env.DEV || !isTauriRuntime()) return;

    let active = true;
    const checkForHotUpdate = async () => {
      try {
        const health = await getHealth({ force: true, timeoutMs: 4_000 });
        if (!active) return;

        const signature =
          health.sidecarBuildId?.trim() || health.sidecarVersion?.trim() || null;

        if (!sidecarBuildSignatureInitializedRef.current) {
          sidecarBuildSignatureRef.current = signature;
          sidecarBuildSignatureInitializedRef.current = true;
          return;
        }

        if (!signature || sidecarBuildSignatureRef.current === signature) {
          return;
        }

        sidecarBuildSignatureRef.current = signature;
        pushNotification({
          id: `app-hot-update-${signature}`,
          kind: "info",
          title: "Update ready",
          message: "A newer BacksterOS build is available. Reload to apply the latest updates.",
          durationMs: 10_000,
          action: {
            label: "Reload",
            onClick: () => window.location.reload(),
          },
        });
      } catch {
        // Ignore transient health check failures.
      }
    };

    void checkForHotUpdate();
    const intervalId = window.setInterval(() => {
      void checkForHotUpdate();
    }, 30_000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [ready]);

  async function handleSettingsUpdated(path: string, nextVaultName?: string | null) {
    setNotesPath(path);
    setVaultName(nextVaultName ?? null);
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
    <NotificationProvider>
    <UiPreviewProvider>
    <div className="app-shell">
      <LinearIssueAgentDispatchHost />
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

      {notesPath ? (
        <VaultProvider notesPath={notesPath} vaultNameOverride={vaultName}>
          <AppShellLayout
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
            ) : null}
          </AppShellLayout>
        </VaultProvider>
      ) : (
        <AppShellLayout
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
    </NotificationProvider>
  );
}
