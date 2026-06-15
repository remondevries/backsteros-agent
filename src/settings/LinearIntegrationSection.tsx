import { useCallback, useEffect, useState } from "react";
import type { LinearIssueLinkMode } from "../chat/types";
import {
  getIntegrationsStatus,
  disconnectLinearOAuth,
  runIntegrationTest,
  saveLinearOAuthCredentials,
  type IntegrationTestResult,
  type IntegrationsStatus,
} from "../lib/api";
import { connectLinearOAuthAndWait } from "../lib/linearConnect";
import {
  getLinearOAuthRedirectUris,
  getLinearOAuthPrimaryRedirectUri,
  usesPublicLinearOAuthRedirect,
} from "../lib/linearOAuthRedirect";
import { openExternalUrl } from "../lib/openExternalUrl";
import { restartSidecarIfNeeded } from "../lib/restartSidecar";
import {
  getLinearOAuthStatusLabel,
  isLinearOAuthConnected,
} from "./integrationConnectionStatus";
import { LinearProjectPicker } from "./LinearProjectPicker";
import { LinearWorkspaceTeamFields } from "./LinearWorkspaceTeamFields";
import { SettingsOptionPicker } from "./SettingsOptionPicker";
import {
  IntegrationSecretInput,
  IntegrationStatusMessages,
  IntegrationTestFeedback,
} from "./integrationShared";

const LINEAR_LINK_MODE_OPTIONS: {
  value: LinearIssueLinkMode;
  label: string;
  description: string;
}[] = [
  {
    value: "external",
    label: "Web URL",
    description: "Open issue links in your browser",
  },
  {
    value: "internal",
    label: "Linear app",
    description: "Open issue links in the Linear desktop app",
  },
];

export type LinearSettingsView = "general" | "oauth";

const LINEAR_DEVELOPER_URL = "https://linear.app/settings/api/applications/new";

export function LinearIntegrationSection({
  activeView,
  issueLinkMode,
  groceryLinearProjectId,
  inboxLinearTeamId,
  dailyLinearTeamId,
  workoutsLinearTeamId,
  lettersLinearTeamId,
  knowledgeBaseLinearTeamId,
  addressbookLinearTeamId,
  workspaceTeamsLoading = false,
  saving,
  onIssueLinkModeChange,
  onGroceryLinearProjectIdChange,
  onInboxLinearTeamIdChange,
  onDailyLinearTeamIdChange,
  onWorkoutsLinearTeamIdChange,
  onLettersLinearTeamIdChange,
  onKnowledgeBaseLinearTeamIdChange,
  onAddressbookLinearTeamIdChange,
  onSecretsUpdated,
}: {
  activeView: LinearSettingsView;
  issueLinkMode: LinearIssueLinkMode;
  groceryLinearProjectId: string;
  inboxLinearTeamId: string;
  dailyLinearTeamId: string;
  workoutsLinearTeamId: string;
  lettersLinearTeamId: string;
  knowledgeBaseLinearTeamId: string;
  addressbookLinearTeamId: string;
  workspaceTeamsLoading?: boolean;
  saving: boolean;
  onIssueLinkModeChange: (value: LinearIssueLinkMode) => void;
  onGroceryLinearProjectIdChange: (value: string) => void;
  onInboxLinearTeamIdChange: (teamId: string) => void;
  onDailyLinearTeamIdChange: (teamId: string) => void;
  onWorkoutsLinearTeamIdChange: (teamId: string) => void;
  onLettersLinearTeamIdChange: (teamId: string) => void;
  onKnowledgeBaseLinearTeamIdChange: (teamId: string) => void;
  onAddressbookLinearTeamIdChange: (teamId: string) => void;
  onSecretsUpdated?: () => void | Promise<void>;
}) {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [clientIdDraft, setClientIdDraft] = useState("");
  const [clientSecretDraft, setClientSecretDraft] = useState("");
  const [credentialsTesting, setCredentialsTesting] = useState(false);
  const [credentialsTestResult, setCredentialsTestResult] = useState<
    IntegrationTestResult | undefined
  >();
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthMessage, setOauthMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const next = await getIntegrationsStatus();
    setStatus(next);
  }, []);

  useEffect(() => {
    void loadStatus().catch((err) => {
      setOauthError(err instanceof Error ? err.message : "Failed to load integration status");
    });
  }, [loadStatus]);

  const linearOAuth = status?.linear;
  const oauthFullyConnected = linearOAuth ? isLinearOAuthConnected(linearOAuth) : false;
  const canDisconnectOAuth = Boolean(linearOAuth?.authenticated);
  const credentialsFromEnv = Boolean(linearOAuth?.credentialsFromEnv);
  const credentialsConfigured = Boolean(linearOAuth?.credentialsConfigured);
  const hasCredentialDraft = Boolean(clientIdDraft.trim() || clientSecretDraft.trim());
  const canTestCredentialDraft =
    Boolean(clientIdDraft.trim()) && Boolean(clientSecretDraft.trim());
  const showSavedCredentialActions = credentialsConfigured && !hasCredentialDraft;
  const credentialsStepComplete = showSavedCredentialActions;
  const oauthBusy = credentialsTesting || connecting || disconnecting;
  const connectButtonDisabled = oauthBusy || !credentialsStepComplete;
  const credentialsTestEnabled =
    !oauthBusy && (canTestCredentialDraft || showSavedCredentialActions);

  const selectedIssueLinkMode =
    LINEAR_LINK_MODE_OPTIONS.find((option) => option.value === issueLinkMode) ?? null;

  function resetCredentialsTest() {
    setCredentialsTestResult(undefined);
  }

  function updateClientIdDraft(value: string) {
    setClientIdDraft(value);
    resetCredentialsTest();
  }

  function updateClientSecretDraft(value: string) {
    setClientSecretDraft(value);
    resetCredentialsTest();
  }

  function resetCredentialDrafts() {
    setClientIdDraft("");
    setClientSecretDraft("");
  }

  async function startBrowserConnect() {
    setConnecting(true);
    setOauthError(null);
    setOauthMessage(null);
    try {
      const result = await connectLinearOAuthAndWait();
      await loadStatus();
      await onSecretsUpdated?.();
      if (result.connected) {
        setOauthMessage("Linear account connected.");
      } else if (result.message) {
        setOauthMessage(result.message);
      }
    } catch (err) {
      setOauthError(err instanceof Error ? err.message : "Failed to start Linear sign-in");
    } finally {
      setConnecting(false);
    }
  }

  async function handleTestCredentials() {
    setCredentialsTesting(true);
    setOauthError(null);
    setOauthMessage(null);
    setCredentialsTestResult(undefined);

    const trimmedClientId = clientIdDraft.trim();
    const trimmedClientSecret = clientSecretDraft.trim();

    try {
      const result = await runIntegrationTest(
        "linearOAuthCredentials",
        canTestCredentialDraft
          ? {
              linearOAuthClientId: trimmedClientId,
              linearOAuthClientSecret: trimmedClientSecret,
            }
          : undefined,
      );

      if (!result.ok) {
        setCredentialsTestResult(result);
        return;
      }

      if (canTestCredentialDraft) {
        const next = await saveLinearOAuthCredentials({
          clientId: trimmedClientId,
          clientSecret: trimmedClientSecret,
        });
        setStatus(next);
        resetCredentialDrafts();
        await restartSidecarIfNeeded();
        await onSecretsUpdated?.();
        setOauthMessage("Linear OAuth credentials saved.");
      }

      setCredentialsTestResult(result);
    } catch (err) {
      setOauthError(err instanceof Error ? err.message : "Failed to test OAuth credentials");
    } finally {
      setCredentialsTesting(false);
    }
  }

  async function handleSaveCredentials() {
    setCredentialsTesting(true);
    setOauthError(null);
    setOauthMessage(null);

    try {
      const next = await saveLinearOAuthCredentials({
        clientId: clientIdDraft.trim(),
        clientSecret: clientSecretDraft.trim(),
      });
      setStatus(next);
      await restartSidecarIfNeeded();
      await onSecretsUpdated?.();
      setClientIdDraft("");
      setClientSecretDraft("");
      setOauthMessage("Linear OAuth credentials saved.");
      setCredentialsTestResult({ ok: true, message: "Saved." });
    } catch (err) {
      setOauthError(err instanceof Error ? err.message : "Failed to save OAuth credentials");
    } finally {
      setCredentialsTesting(false);
    }
  }

  async function handleDisconnectOAuth() {
    setDisconnecting(true);
    setOauthError(null);
    setOauthMessage(null);
    try {
      const next = await disconnectLinearOAuth();
      setStatus(next);
      await onSecretsUpdated?.();
      setOauthMessage("Linear account disconnected.");
    } catch (err) {
      setOauthError(err instanceof Error ? err.message : "Failed to disconnect Linear account");
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleRemoveCredentials() {
    setCredentialsTesting(true);
    setOauthError(null);
    setOauthMessage(null);
    try {
      const next = await saveLinearOAuthCredentials({ clear: true });
      setStatus(next);
      resetCredentialDrafts();
      resetCredentialsTest();
      await restartSidecarIfNeeded();
      await onSecretsUpdated?.();
      setOauthMessage("Linear OAuth credentials removed.");
    } catch (err) {
      setOauthError(err instanceof Error ? err.message : "Failed to remove Linear OAuth credentials");
    } finally {
      setCredentialsTesting(false);
    }
  }

  return (
    <section className="settings-section">
      {activeView === "general" ? (
        <>
          <LinearWorkspaceTeamFields
            layout="settings"
            inboxTeamId={inboxLinearTeamId}
            dailyTeamId={dailyLinearTeamId}
            workoutsTeamId={workoutsLinearTeamId}
            lettersTeamId={lettersLinearTeamId}
            knowledgeBaseTeamId={knowledgeBaseLinearTeamId}
            addressbookTeamId={addressbookLinearTeamId}
            workspaceTeamsLoading={workspaceTeamsLoading}
            onInboxTeamIdChange={onInboxLinearTeamIdChange}
            onDailyTeamIdChange={onDailyLinearTeamIdChange}
            onWorkoutsTeamIdChange={onWorkoutsLinearTeamIdChange}
            onLettersTeamIdChange={onLettersLinearTeamIdChange}
            onKnowledgeBaseTeamIdChange={onKnowledgeBaseLinearTeamIdChange}
            onAddressbookTeamIdChange={onAddressbookLinearTeamIdChange}
            disabled={saving}
          />

          <label className="settings-field-label" htmlFor="issue-link-mode">
            Issue link destination
          </label>
          <p className="settings-hint">
            Choose how Linear issue links open when you click them in chat or the Linear view.
          </p>
          <div className="settings-row settings-row-project-picker">
            <SettingsOptionPicker
              id="issue-link-mode"
              value={issueLinkMode}
              disabled={saving}
              options={LINEAR_LINK_MODE_OPTIONS}
              onChange={onIssueLinkModeChange}
            />
          </div>
          {selectedIssueLinkMode ? (
            <p className="settings-hint settings-hint-spaced">
              Selected: {selectedIssueLinkMode.label} — {selectedIssueLinkMode.description}
            </p>
          ) : null}

          <label className="settings-field-label" htmlFor="grocery-linear-project">
            Grocery list project
          </label>
          <p className="settings-hint">
            Weekly grocery items are added as checkboxes on a Linear issue in this project.
          </p>
          <div className="settings-row settings-row-project-picker">
            <LinearProjectPicker
              id="grocery-linear-project"
              value={groceryLinearProjectId}
              disabled={saving}
              clearAriaLabel="Clear grocery project"
              onChange={onGroceryLinearProjectIdChange}
            />
          </div>
        </>
      ) : null}

      {activeView === "oauth" ? (
        <>
          {credentialsFromEnv ? (
            <>
              <p className="settings-hint settings-hint-spaced-top">
                Linear sign-in is provided by this app. Click below to connect your Linear account.
              </p>
              {linearOAuth ? (
                <p className="settings-hint settings-hint-spaced">
                  OAuth status: {getLinearOAuthStatusLabel(linearOAuth)}
                </p>
              ) : null}
              <div className="settings-row settings-row-actions">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={oauthBusy}
                  onClick={() => {
                    void startBrowserConnect();
                  }}
                >
                  {connecting
                    ? "Waiting for sign-in…"
                    : oauthFullyConnected
                      ? "Reconnect Linear account"
                      : "Connect Linear account"}
                </button>
                {canDisconnectOAuth ? (
                  <button
                    type="button"
                    className="btn-secondary settings-integration-test-button settings-integration-test-button--remove"
                    disabled={oauthBusy}
                    onClick={() => {
                      void handleDisconnectOAuth();
                    }}
                  >
                    {disconnecting ? "Disconnecting…" : "Disconnect"}
                  </button>
                ) : null}
              </div>
              <IntegrationStatusMessages message={oauthMessage} error={oauthError} />
            </>
          ) : (
            <>
          <p className="settings-hint settings-hint-spaced-top">
            Create a Linear OAuth app and add the redirect URI below exactly as shown. Linear requires
            an exact match for <code>redirect_uri</code>. Secrets are stored locally in{" "}
            <code>~/.backsteros-agent/</code>.
          </p>

          <p className="settings-hint settings-hint-spaced">
            Primary redirect URI:{" "}
            <code className="settings-inline-code">{getLinearOAuthPrimaryRedirectUri()}</code>
          </p>
          {!usesPublicLinearOAuthRedirect() ? (
            <>
              <p className="settings-hint">
                If port 3510 is already in use, BacksterOS may use 3511–3515 instead. Register these too if
                sign-in fails with an invalid redirect URI:
              </p>
              <ul className="settings-hint settings-linear-oauth-redirect-list">
                {getLinearOAuthRedirectUris().map((redirectUri) => (
                  <li key={redirectUri}>
                    <code className="settings-inline-code">{redirectUri}</code>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {linearOAuth ? (
            <p className="settings-hint settings-hint-spaced">
              OAuth status: {getLinearOAuthStatusLabel(linearOAuth)}
            </p>
          ) : null}

          <p className="settings-hint">
            <button
              type="button"
              className="settings-inline-link"
              onClick={() => {
                void openExternalUrl(LINEAR_DEVELOPER_URL);
              }}
            >
              Create OAuth app
            </button>
          </p>

          <IntegrationSecretInput
            id="linear-oauth-client-id"
            label="Client ID"
            value={clientIdDraft}
            configured={Boolean(linearOAuth?.clientId.configured)}
            savedPreview={linearOAuth?.clientId.preview}
            unsetPlaceholder="Linear OAuth client ID"
            inputType="text"
            disabled={oauthBusy}
            onChange={updateClientIdDraft}
          />

          <IntegrationSecretInput
            id="linear-oauth-client-secret"
            label="Client secret"
            value={clientSecretDraft}
            configured={Boolean(linearOAuth?.clientSecret.configured)}
            savedPreview={linearOAuth?.clientSecret.preview}
            unsetPlaceholder="Linear OAuth client secret"
            disabled={oauthBusy}
            onChange={updateClientSecretDraft}
          />

          <IntegrationTestFeedback result={credentialsTestResult} />

          <div className="settings-row settings-row-actions">
            {(canTestCredentialDraft || showSavedCredentialActions) && (
              <button
                type="button"
                className="btn-secondary"
                disabled={!credentialsTestEnabled}
                onClick={() => {
                  void handleTestCredentials();
                }}
              >
                {credentialsTesting ? "Testing…" : "Test credentials"}
              </button>
            )}
            {canTestCredentialDraft && (
              <button
                type="button"
                className="btn-secondary"
                disabled={oauthBusy}
                onClick={() => {
                  void handleSaveCredentials();
                }}
              >
                Save credentials
              </button>
            )}
            {showSavedCredentialActions && (
              <button
                type="button"
                className="btn-secondary settings-integration-test-button settings-integration-test-button--remove"
                disabled={oauthBusy}
                onClick={() => {
                  void handleRemoveCredentials();
                }}
              >
                Remove
              </button>
            )}
          </div>

          {credentialsStepComplete ? (
            <>
              <h3 className="settings-subsection-title">Sign in with Linear</h3>
              <p className="settings-hint settings-hint-spaced-top">
                Opens your browser so you can authorize BacksterOS Agent to access your Linear account.
              </p>
              <div className="settings-row settings-row-actions">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={connectButtonDisabled}
                  onClick={() => {
                    void startBrowserConnect();
                  }}
                >
                  {connecting
                    ? "Waiting for sign-in…"
                    : oauthFullyConnected
                      ? "Reconnect Linear account"
                      : "Connect Linear account"}
                </button>
                {canDisconnectOAuth ? (
                  <button
                    type="button"
                    className="btn-secondary settings-integration-test-button settings-integration-test-button--remove"
                    disabled={oauthBusy}
                    onClick={() => {
                      void handleDisconnectOAuth();
                    }}
                  >
                    {disconnecting ? "Disconnecting…" : "Disconnect"}
                  </button>
                ) : null}
              </div>
            </>
          ) : null}

          <IntegrationStatusMessages message={oauthMessage} error={oauthError} />
            </>
          )}
        </>
      ) : null}
    </section>
  );
}
