import { useCallback, useEffect, useRef, useState } from "react";
import { AppShellLayout } from "./app/AppShellLayout";
import { CursorConnectGate } from "./app/CursorConnectGate";
import { LinearConnectGate } from "./app/LinearConnectGate";
import { LinearOAuthSuccessGate } from "./app/LinearOAuthSuccessGate";
import { SetupConnectGate } from "./app/SetupConnectGate";
import type { ConnectGateProgressStep } from "./app/ConnectGateProgress";
import { ServiceOfflineShell } from "./app/ServiceOfflineShell";
import { UiPreviewProvider } from "./chat/dev/UiPreviewContext";
import { NotificationProvider } from "./app/notifications/NotificationProvider";
import {
  addLinearWatcherStreamListener,
  subscribeToLinearWatcherEvents,
} from "./lib/linearWatcherEvents";
import { startLinearIssueAgentDispatch } from "./lib/linearIssueAgentDispatch";
import { LinearIssueAgentDispatchHost } from "./app/project-issues/LinearIssueAgentDispatchHost";
import type { ModelMode } from "./chat/types";
import { useSystemTheme } from "./hooks/useSystemTheme";
import { useRightPanelSession } from "./hooks/useRightPanelSession";
import {
  readPersistedSettingsTab,
  readPersistedShowSettings,
  readPersistedVaultNavItem,
  readPersistedWorkspaceTeams,
  writePersistedAppState,
} from "./hooks/usePersistedAppState";
import type { SidebarNavItemId } from "./app/sidebarNavConfig";
import { SettingsPanel } from "./settings/SettingsPanel";
import type { SettingsTabId } from "./settings/settingsTabs";
import { isAdminOnlySettingsNavTab } from "./settings/settingsTabs";
import { useAdministratorAccess } from "./settings/useAdministratorAccess";
import { VaultProvider } from "./chat/VaultContext";
import {
  formatSidecarReachabilityError,
  getAccountWorkspace,
  getAuthStatus,
  getHealth,
  getSettings,
  ensureVaultDailyNoteToday,
  invalidateDashboardRequestCache,
} from "./lib/api";
import { isAccountSetupComplete } from "./lib/accountWorkspace";
import { connectGoogleCalendarAndWait } from "./lib/googleCalendarConnect";
import { getCalendarStartupWarning } from "./lib/integrationWarnings";
import { isLinearAccessGranted } from "./lib/linearAccess";
import { subscribeLinearSessionExpired } from "./lib/linearSessionExpired";
import {
  clearConnectGateAccessCache,
  isConnectGateAccessCached,
  writeConnectGateAccessCache,
} from "./lib/connectGateAccessCache";
import { isLinearProductMode } from "./lib/productMode";
import { readConnectGateReturnParams } from "./lib/connectGateReturn";
import { setLinearIssueLinkMode } from "./lib/linear/linearLink";
import { pushNotification } from "./lib/notifications";
import { openExternalUrl } from "./lib/openExternalUrl";
import {
  BOOTSTRAP_CHECKING_MESSAGE,
  configureSidecarConnection,
  fetchBootstrapHealth,
} from "./lib/sidecarBootstrap";
import { isTauriRuntime, isTauriRemoteShell } from "./platform/runtime";
import {
  describeDesktopReleaseMismatch,
  getClientAppBuildSha,
} from "./lib/releaseSync";
import {
  appendNotificationEdgeCache,
  showNativeNotification,
} from "./platform/notifications";

function defaultVaultNavItem(): SidebarNavItemId {
  return "inbox";
}

export default function App() {
  const connectGateAccessCached = isConnectGateAccessCached();
  const [appReady, setAppReady] = useState(connectGateAccessCached);
  const [gateNotice, setGateNotice] = useState<string | null>(
    connectGateAccessCached ? null : BOOTSTRAP_CHECKING_MESSAGE,
  );
  const [notesPath, setNotesPath] = useState<string | null>(null);
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [vaultEnabled, setVaultEnabled] = useState(!isLinearProductMode());
  const [vaultName, setVaultName] = useState<string | null>(null);
  const [defaultNotesPath, setDefaultNotesPath] = useState("");
  const [modelMode, setModelMode] = useState<ModelMode>("auto");
  const [userProfilePath, setUserProfilePath] = useState<string | undefined>();
  const [agentProfilePath, setAgentProfilePath] = useState<string | undefined>();
  const [showSettings, setShowSettings] = useState(() => readPersistedShowSettings());
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTabId>(
    () => readPersistedSettingsTab() ?? "account",
  );
  const { isAdministrator, loading: administratorAccessLoading } = useAdministratorAccess();
  const [connectGateFocusStep, setConnectGateFocusStep] =
    useState<ConnectGateProgressStep>("cursor");
  const [serverAccessRequired, setServerAccessRequired] = useState(false);
  const [showLinearOAuthSuccess, setShowLinearOAuthSuccess] = useState(false);
  const [cursorKeyConfigured, setCursorKeyConfigured] = useState(connectGateAccessCached);
  const [linearAccessReady, setLinearAccessReady] = useState(connectGateAccessCached);
  const [serviceOffline, setServiceOffline] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [linearWarning, setLinearWarning] = useState<string | null>(null);
  const [calendarWarning, setCalendarWarning] = useState<string | null>(null);
  const [calendarConnecting, setCalendarConnecting] = useState(false);
  const [needsCalendarConnect, setNeedsCalendarConnect] = useState(false);
  const [whoopWarning, setWhoopWarning] = useState<string | null>(null);
  const [desktopReleaseWarning, setDesktopReleaseWarning] = useState<string | null>(null);
  const persistedWorkspaceTeams = readPersistedWorkspaceTeams();
  const [inboxLinearTeamId, setInboxLinearTeamId] = useState<string | null>(
    () => persistedWorkspaceTeams.inboxLinearTeamId ?? null,
  );
  const [dailyLinearTeamId, setDailyLinearTeamId] = useState<string | null>(
    () => persistedWorkspaceTeams.dailyLinearTeamId ?? null,
  );
  const [workoutsLinearTeamId, setWorkoutsLinearTeamId] = useState<string | null>(
    () => persistedWorkspaceTeams.workoutsLinearTeamId ?? null,
  );
  const [lettersLinearTeamId, setLettersLinearTeamId] = useState<string | null>(
    () => persistedWorkspaceTeams.lettersLinearTeamId ?? null,
  );
  const [knowledgeBaseLinearTeamId, setKnowledgeBaseLinearTeamId] = useState<string | null>(
    () => persistedWorkspaceTeams.knowledgeBaseLinearTeamId ?? null,
  );
  const [addressbookLinearTeamId, setAddressbookLinearTeamId] = useState<string | null>(
    () => persistedWorkspaceTeams.addressbookLinearTeamId ?? null,
  );
  const [linearUserId, setLinearUserId] = useState<string | null>(null);
  const [workspaceTeamsLoaded, setWorkspaceTeamsLoaded] = useState(false);
  const [activeVaultNavItem, setActiveVaultNavItem] = useState<SidebarNavItemId | null>(
    () => readPersistedVaultNavItem() ?? defaultVaultNavItem(),
  );
  const sidecarBuildSignatureRef = useRef<string | null>(null);
  const sidecarBuildSignatureInitializedRef = useRef(false);
  const awaitingSetupRef = useRef(false);

  const applyAccountWorkspaceTeams = useCallback(
    (workspace: {
      inboxLinearTeamId?: string | null;
      dailyLinearTeamId?: string | null;
      workoutsLinearTeamId?: string | null;
      lettersLinearTeamId?: string | null;
      knowledgeBaseLinearTeamId?: string | null;
      addressbookLinearTeamId?: string | null;
    }) => {
      if (workspace.inboxLinearTeamId !== undefined) {
        setInboxLinearTeamId(workspace.inboxLinearTeamId?.trim() ?? null);
      }
      if (workspace.dailyLinearTeamId !== undefined) {
        setDailyLinearTeamId(workspace.dailyLinearTeamId?.trim() ?? null);
      }
      if (workspace.workoutsLinearTeamId !== undefined) {
        setWorkoutsLinearTeamId(workspace.workoutsLinearTeamId?.trim() ?? null);
      }
      if (workspace.lettersLinearTeamId !== undefined) {
        setLettersLinearTeamId(workspace.lettersLinearTeamId?.trim() ?? null);
      }
      if (workspace.knowledgeBaseLinearTeamId !== undefined) {
        setKnowledgeBaseLinearTeamId(workspace.knowledgeBaseLinearTeamId?.trim() ?? null);
      }
      if (workspace.addressbookLinearTeamId !== undefined) {
        setAddressbookLinearTeamId(workspace.addressbookLinearTeamId?.trim() ?? null);
      }
      const persistedTeams = readPersistedWorkspaceTeams();
      const normalizeTeamId = (value: string | null | undefined) => value?.trim() ?? null;
      writePersistedAppState({
        workspaceTeams: {
          inboxLinearTeamId:
            workspace.inboxLinearTeamId !== undefined
              ? normalizeTeamId(workspace.inboxLinearTeamId)
              : persistedTeams.inboxLinearTeamId ?? null,
          dailyLinearTeamId:
            workspace.dailyLinearTeamId !== undefined
              ? normalizeTeamId(workspace.dailyLinearTeamId)
              : persistedTeams.dailyLinearTeamId ?? null,
          workoutsLinearTeamId:
            workspace.workoutsLinearTeamId !== undefined
              ? normalizeTeamId(workspace.workoutsLinearTeamId)
              : persistedTeams.workoutsLinearTeamId ?? null,
          lettersLinearTeamId:
            workspace.lettersLinearTeamId !== undefined
              ? normalizeTeamId(workspace.lettersLinearTeamId)
              : persistedTeams.lettersLinearTeamId ?? null,
          knowledgeBaseLinearTeamId:
            workspace.knowledgeBaseLinearTeamId !== undefined
              ? normalizeTeamId(workspace.knowledgeBaseLinearTeamId)
              : persistedTeams.knowledgeBaseLinearTeamId ?? null,
          addressbookLinearTeamId:
            workspace.addressbookLinearTeamId !== undefined
              ? normalizeTeamId(workspace.addressbookLinearTeamId)
              : persistedTeams.addressbookLinearTeamId ?? null,
        },
      });
      setWorkspaceTeamsLoaded(true);
    },
    [],
  );

  const vaultPath = notesPath ?? workspacePath;
  const chatEnabled =
    appReady &&
    linearAccessReady &&
    (isLinearProductMode() && !vaultEnabled
      ? true
      : Boolean(vaultPath) && (!vaultEnabled || Boolean(notesPath)));

  useSystemTheme();

  const settingsMode = !chatEnabled || showSettings;
  const rightPanelChatEnabled = chatEnabled && !settingsMode;
  const linearWorkspaceEnabled = chatEnabled && !settingsMode;
  const vaultExplorerEnabled = linearWorkspaceEnabled && vaultEnabled;
  const {
    session: rightPanelSession,
    loading: rightPanelSessionLoading,
    saveSessionState: saveRightPanelSessionState,
  } = useRightPanelSession(rightPanelChatEnabled);

  useEffect(() => {
    if (!appReady || !chatEnabled) return;
    writePersistedAppState({
      appView: "chat",
      showSettings,
      activeSettingsTab,
      activeVaultNavItem: activeVaultNavItem ?? undefined,
    });
  }, [activeSettingsTab, activeVaultNavItem, chatEnabled, appReady, showSettings]);

  useEffect(() => {
    if (!isLinearProductMode() || !workspaceTeamsLoaded || !appReady) return;
    if (!inboxLinearTeamId?.trim() && activeVaultNavItem === "inbox") {
      setActiveVaultNavItem("projects");
    }
    if (!dailyLinearTeamId?.trim() && activeVaultNavItem === "daily") {
      setActiveVaultNavItem("projects");
    }
    if (!workoutsLinearTeamId?.trim() && activeVaultNavItem === "workouts") {
      setActiveVaultNavItem("projects");
    }
    if (!lettersLinearTeamId?.trim() && activeVaultNavItem === "letters") {
      setActiveVaultNavItem("projects");
    }
    if (!knowledgeBaseLinearTeamId?.trim() && activeVaultNavItem === "knowledge-base") {
      setActiveVaultNavItem("projects");
    }
    if (!addressbookLinearTeamId?.trim() && activeVaultNavItem === "contacts") {
      setActiveVaultNavItem("projects");
    }
  }, [
    activeVaultNavItem,
    appReady,
    addressbookLinearTeamId,
    dailyLinearTeamId,
    inboxLinearTeamId,
    knowledgeBaseLinearTeamId,
    lettersLinearTeamId,
    workoutsLinearTeamId,
    workspaceTeamsLoaded,
  ]);

  const handleOpenSettings = useCallback(() => {
    setActiveSettingsTab("general");
    setShowSettings(true);
  }, []);

  const handleExitSettings = useCallback(() => {
    if (!chatEnabled) return;
    setShowSettings(false);
  }, [chatEnabled]);

  const handleToggleSettings = useCallback(() => {
    if (!chatEnabled) return;
    setShowSettings((open) => {
      if (open) {
        return false;
      }
      setActiveSettingsTab("general");
      return true;
    });
  }, [chatEnabled]);

  useEffect(() => {
    if (!chatEnabled && appReady) {
      setActiveSettingsTab("general");
    }
  }, [chatEnabled, appReady]);

  useEffect(() => {
    if (vaultEnabled || activeSettingsTab !== "obsidian") return;
    setActiveSettingsTab("general");
  }, [activeSettingsTab, vaultEnabled]);

  useEffect(() => {
    if (administratorAccessLoading || isAdministrator) return;
    if (!isAdminOnlySettingsNavTab(activeSettingsTab)) return;
    setActiveSettingsTab("general");
  }, [activeSettingsTab, administratorAccessLoading, isAdministrator]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === ",") {
        event.preventDefault();
        handleToggleSettings();
        return;
      }

      if (event.key === "Escape" && showSettings && chatEnabled) {
        event.preventDefault();
        handleExitSettings();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [chatEnabled, handleExitSettings, handleToggleSettings, showSettings]);

  const runBootstrap = useCallback(async (options?: {
    forceConnectGate?: boolean;
  }): Promise<{
    linearReady: boolean;
    hasApiKey: boolean;
    appReady: boolean;
  }> => {
    const preserveConnectGateShell =
      !options?.forceConnectGate && isConnectGateAccessCached();

    setBootstrapping(true);
    if (!preserveConnectGateShell) {
      setAppReady(false);
    }
    setServiceOffline(false);
    if (!preserveConnectGateShell) {
      setGateNotice(BOOTSTRAP_CHECKING_MESSAGE);
    }
    setHealthError(null);
    invalidateDashboardRequestCache();

    try {
      await configureSidecarConnection();
      const health = await fetchBootstrapHealth();

      const linearReady = isLinearAccessGranted(health);
      setLinearAccessReady(linearReady);
      setDesktopReleaseWarning(
        isTauriRemoteShell()
          ? describeDesktopReleaseMismatch(getClientAppBuildSha(), health.appBuildSha)
          : null,
      );
      if (!linearReady) {
        clearConnectGateAccessCache();
        setAppReady(false);
        setServiceOffline(false);
        setGateNotice(null);
        return { linearReady: false, hasApiKey: false, appReady: false };
      }

      setServiceOffline(false);

      if (!import.meta.env.DEV && health.requiresServerAccessAuth !== false) {
        const authStatus = await getAuthStatus();
        if (!authStatus.authenticated) {
          clearConnectGateAccessCache();
          setAppReady(false);
          setServerAccessRequired(true);
          setConnectGateFocusStep("linear");
          setGateNotice(
            "Server access denied. Sign in with your server access token below, then retry.",
          );
          return { linearReady: true, hasApiKey: false, appReady: false };
        }
      }

      setServerAccessRequired(false);

      const settings = await getSettings();
      if (!health.hasApiKey) {
        clearConnectGateAccessCache();
        setCursorKeyConfigured(false);
        setAppReady(false);
        setGateNotice(null);
        return { linearReady: true, hasApiKey: false, appReady: false };
      }

      if (health.cursorApiKeyValid === false) {
        clearConnectGateAccessCache();
        setCursorKeyConfigured(false);
        setAppReady(false);
        setGateNotice(
          "Your Cursor API key is invalid or expired. Update it below, then continue.",
        );
        setConnectGateFocusStep("cursor");
        return { linearReady: true, hasApiKey: false, appReady: false };
      }

      setCursorKeyConfigured(true);

      const serverVaultEnabled =
        settings.vaultEnabled ?? health.vaultEnabled ?? !isLinearProductMode();
      setVaultEnabled(serverVaultEnabled);

      if (!health.hasLinearOAuthAuth) {
        setLinearWarning(
          "Linear is not connected. Connect Linear OAuth in Settings.",
        );
      } else {
        setLinearWarning(null);
      }
      const calendarWarningState = getCalendarStartupWarning(health);
      setCalendarWarning(calendarWarningState.message);
      setNeedsCalendarConnect(calendarWarningState.needsConnect);
      if (!health.hasWhoopAuth) {
        setWhoopWarning(
          "Whoop is not connected. Open Settings → Whoop to sign in.",
        );
      } else {
        setWhoopWarning(null);
      }

      setNotesPath(settings.notesPath);
      setWorkspacePath(settings.workspacePath ?? null);
      setVaultName(settings.vaultName ?? null);
      setDefaultNotesPath(settings.defaultNotesPath);
      setModelMode(settings.modelMode);
      setLinearIssueLinkMode(settings.issueLinkMode ?? "external");
      setUserProfilePath(settings.userProfilePath);
      setAgentProfilePath(settings.agentProfilePath);

      if (serverVaultEnabled && settings.notesPath) {
        try {
          await ensureVaultDailyNoteToday();
        } catch {
          // Best-effort — vault may be temporarily unavailable.
        }
      }

      let needsSetup = false;
      try {
        const account = await getAccountWorkspace();
        setLinearUserId(account.linearUserId?.trim() ?? null);
        applyAccountWorkspaceTeams(account.workspace);
        needsSetup = !isAccountSetupComplete(account.workspace, {
          isAdministrator: account.isAdministrator,
        });
      } catch {
        setLinearUserId(null);
        setWorkspaceTeamsLoaded(true);
        needsSetup = awaitingSetupRef.current;
      }
      if (needsSetup) {
        awaitingSetupRef.current = true;
        setConnectGateFocusStep("setup");
      } else {
        awaitingSetupRef.current = false;
      }

      setGateNotice(null);
      if (awaitingSetupRef.current) {
        clearConnectGateAccessCache();
        setAppReady(false);
        return { linearReady: true, hasApiKey: true, appReady: false };
      }
      writeConnectGateAccessCache();
      setAppReady(true);
      return { linearReady: true, hasApiKey: true, appReady: true };
    } catch (err) {
      const message = formatSidecarReachabilityError(err);
      const isUnauthorized =
        message.toLowerCase().includes("unauthorized") || message.includes("401");
      if (isUnauthorized) {
        setServerAccessRequired(true);
        setConnectGateFocusStep("linear");
        setGateNotice(
          "Server access denied. Sign in with your server access token below, then retry.",
        );
        setServiceOffline(false);
      } else {
        setGateNotice(message);
        setServiceOffline(true);
      }
      clearConnectGateAccessCache();
      setLinearAccessReady(false);
      setAppReady(false);
      setDesktopReleaseWarning(null);
      return { linearReady: false, hasApiKey: false, appReady: false };
    } finally {
      setBootstrapping(false);
    }
  }, [applyAccountWorkspaceTeams]);

  const handleWorkspaceTeamsUpdated = useCallback(
    (workspace: {
      inboxLinearTeamId?: string | null;
      dailyLinearTeamId?: string | null;
      workoutsLinearTeamId?: string | null;
      lettersLinearTeamId?: string | null;
      knowledgeBaseLinearTeamId?: string | null;
      addressbookLinearTeamId?: string | null;
    }) => {
      applyAccountWorkspaceTeams(workspace);
    },
    [applyAccountWorkspaceTeams],
  );

  const handleLinearOAuthSuccess = useCallback(async () => {
    const result = await runBootstrap();
    if (!result.linearReady) {
      return;
    }
    if (!result.hasApiKey) {
      setShowLinearOAuthSuccess(false);
      setConnectGateFocusStep("cursor");
      return;
    }
    if (result.appReady) {
      setShowLinearOAuthSuccess(false);
      return;
    }
    setShowLinearOAuthSuccess(true);
  }, [runBootstrap]);

  useEffect(() => {
    const { cursorStep, setupStep } = readConnectGateReturnParams();
    if (setupStep) {
      awaitingSetupRef.current = true;
      setConnectGateFocusStep("setup");
    } else if (cursorStep) {
      setConnectGateFocusStep("cursor");
    }
    void runBootstrap();
  }, [runBootstrap]);

  useEffect(() => {
    return subscribeLinearSessionExpired(() => {
      clearConnectGateAccessCache();
      invalidateDashboardRequestCache();
      awaitingSetupRef.current = false;
      setShowSettings(false);
      setShowLinearOAuthSuccess(false);
      setConnectGateFocusStep("linear");
      setLinearAccessReady(true);
      setAppReady(false);
      setGateNotice(null);
    });
  }, []);

  useEffect(() => {
    if (!appReady || !linearAccessReady) return;
    return subscribeToLinearWatcherEvents();
  }, [linearAccessReady, appReady]);

  useEffect(() => {
    if (!appReady || !linearAccessReady) return;
    return startLinearIssueAgentDispatch();
  }, [linearAccessReady, appReady]);

  useEffect(() => {
    if (!appReady || !linearAccessReady || !isTauriRuntime()) return;

    return addLinearWatcherStreamListener((event) => {
      if (event.type !== "linear.watcher.change") return;
      if (typeof document === "undefined" || !document.hidden) return;

      const title = event.title?.trim() || event.identifier || "Linear update";
      const body = event.summary?.trim() || event.changeKind;
      appendNotificationEdgeCache({
        id: `linear-watcher-${event.issueId}-${event.detectedAt}`,
        kind: "info",
        title,
        message: body,
      });
      void showNativeNotification(title, body);
    });
  }, [linearAccessReady, appReady]);

  useEffect(() => {
    if (!appReady || import.meta.env.DEV || !isTauriRuntime()) return;

    let active = true;
    const checkForHotUpdate = async () => {
      try {
        const health = await getHealth({ force: true, timeoutMs: 4_000 });
        if (!active) return;

        if (isTauriRemoteShell()) {
          setDesktopReleaseWarning(
            describeDesktopReleaseMismatch(getClientAppBuildSha(), health.appBuildSha),
          );
          return;
        }

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
  }, [appReady]);

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

  function handleWhoopSetup() {
    setWhoopWarning(null);
    setShowSettings(true);
    setActiveSettingsTab("whoop");
  }

  if (!appReady) {
    if (serviceOffline) {
      return (
        <ServiceOfflineShell
          retrying={bootstrapping}
          onRetry={() => {
            void runBootstrap();
          }}
        />
      );
    }

    if (linearAccessReady) {
      if (serverAccessRequired || connectGateFocusStep === "linear") {
        return (
          <LinearConnectGate
            showCursorStepOption={!serverAccessRequired}
            cursorStepComplete={cursorKeyConfigured}
            bootstrapMessage={gateNotice}
            bootstrapRetrying={bootstrapping}
            onBootstrapRetry={() => {
              void runBootstrap();
            }}
            onServerAccessSignedIn={() => runBootstrap()}
            onAdvanceToCursor={() => {
              setConnectGateFocusStep("cursor");
            }}
            onOAuthSuccess={() => {
              void handleLinearOAuthSuccess();
            }}
          />
        );
      }

      if (connectGateFocusStep === "setup") {
        return (
          <SetupConnectGate
            onComplete={async () => {
              awaitingSetupRef.current = false;
              await runBootstrap();
            }}
            onLinearStepClick={() => {
              setConnectGateFocusStep("linear");
            }}
            onCursorStepClick={() => {
              setShowLinearOAuthSuccess(false);
              setConnectGateFocusStep("cursor");
            }}
          />
        );
      }

      if (showLinearOAuthSuccess) {
        return (
          <LinearOAuthSuccessGate
            cursorStepComplete={cursorKeyConfigured}
            onGoToSetup={() => {
              setShowLinearOAuthSuccess(false);
              awaitingSetupRef.current = true;
              setConnectGateFocusStep("setup");
            }}
          />
        );
      }

      return (
        <CursorConnectGate
          cursorStepComplete={cursorKeyConfigured}
          bootstrapNotice={gateNotice}
            onGoToSetup={async () => {
              awaitingSetupRef.current = true;
              setConnectGateFocusStep("setup");
              await runBootstrap();
            }}
          onLinearStepClick={() => {
            setConnectGateFocusStep("linear");
          }}
        />
      );
    }

    return (
      <LinearConnectGate
        bootstrapMessage={gateNotice}
        bootstrapRetrying={bootstrapping}
        onBootstrapRetry={() => {
          void runBootstrap();
        }}
        onServerAccessSignedIn={() => runBootstrap()}
        onOAuthSuccess={() => {
          void handleLinearOAuthSuccess();
        }}
      />
    );
  }

  const shellContent = (
    <>
      <LinearIssueAgentDispatchHost />
      {healthError && (
        <div className="warning-banner">
          <span>{healthError}</span>
          <button
            type="button"
            className="warning-banner-action"
            disabled={bootstrapping}
            onClick={() => {
              void runBootstrap();
            }}
          >
            {bootstrapping ? "Connecting…" : "Retry connection"}
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
            Connect Whoop
          </button>
        </div>
      )}
      {!healthError && desktopReleaseWarning && (
        <div className="warning-banner">
          <span>{desktopReleaseWarning}</span>
        </div>
      )}

      <AppShellLayout
        settingsOpen={settingsMode}
        activeSettingsTab={activeSettingsTab}
        onSettingsTabChange={setActiveSettingsTab}
        onOpenSettings={handleOpenSettings}
        onExitSettings={chatEnabled ? handleExitSettings : undefined}
        rightPanelChatEnabled={rightPanelChatEnabled}
        rightPanelSession={rightPanelSession}
        rightPanelSessionLoading={rightPanelSessionLoading}
        onSaveRightPanelSessionState={saveRightPanelSessionState}
        activeVaultNavItem={chatEnabled ? activeVaultNavItem : null}
        onVaultNavItemChange={chatEnabled ? setActiveVaultNavItem : () => undefined}
        inboxLinearTeamId={inboxLinearTeamId}
        dailyLinearTeamId={dailyLinearTeamId}
        workoutsLinearTeamId={workoutsLinearTeamId}
        lettersLinearTeamId={lettersLinearTeamId}
        knowledgeBaseLinearTeamId={knowledgeBaseLinearTeamId}
        addressbookLinearTeamId={addressbookLinearTeamId}
        linearWorkspaceEnabled={linearWorkspaceEnabled}
        vaultExplorerEnabled={vaultExplorerEnabled}
        linearUserId={linearUserId}
        urlSyncEnabled={chatEnabled && appReady && Boolean(linearUserId)}
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
            initialInboxLinearTeamId={inboxLinearTeamId}
            initialDailyLinearTeamId={dailyLinearTeamId}
            initialWorkoutsLinearTeamId={workoutsLinearTeamId}
            initialLettersLinearTeamId={lettersLinearTeamId}
            initialKnowledgeBaseLinearTeamId={knowledgeBaseLinearTeamId}
            initialAddressbookLinearTeamId={addressbookLinearTeamId}
            vaultEnabled={vaultEnabled}
            onSecretsUpdated={() => void runBootstrap()}
            onWorkspaceTeamsUpdated={handleWorkspaceTeamsUpdated}
            onUpdated={(path, nextVaultName) => {
              void handleSettingsUpdated(path, nextVaultName);
            }}
            onServerAccessSaved={() => void runBootstrap()}
            onAccountDeleted={() => {
              clearConnectGateAccessCache();
              void runBootstrap({ forceConnectGate: true });
            }}
          />
        ) : null}
      </AppShellLayout>
    </>
  );

  return (
    <NotificationProvider>
      <UiPreviewProvider>
        <div className="app-shell">
          {vaultPath ? (
            <VaultProvider notesPath={vaultPath} vaultNameOverride={vaultName}>
              {shellContent}
            </VaultProvider>
          ) : (
            shellContent
          )}
        </div>
      </UiPreviewProvider>
    </NotificationProvider>
  );
}
