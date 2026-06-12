import { useCallback, useEffect, useState } from "react";
import type { LinearIssueLinkMode } from "../chat/types";
import {
  getIntegrationsStatus,
  runIntegrationTest,
  saveLinearOAuthCredentials,
  type IntegrationTestResult,
  type IntegrationsStatus,
} from "../lib/api";
import { connectLinearOAuthAndWait } from "../lib/linearConnect";
import {
  getLinearOAuthRedirectUris,
  LINEAR_OAUTH_PRIMARY_REDIRECT_URI,
} from "../lib/linearOAuthRedirect";
import { openExternalUrl } from "../lib/openExternalUrl";
import { restartSidecarIfNeeded } from "../lib/restartSidecar";
import {
  getLinearOAuthStatusLabel,
  isLinearOAuthConnected,
  isLinearSettingsConnected,
} from "./integrationConnectionStatus";
import { LinearProjectPicker } from "./LinearProjectPicker";
import { SettingsOptionPicker } from "./SettingsOptionPicker";
import {
  ApiKeyField,
  IntegrationSecretInput,
  IntegrationStatusLine,
  IntegrationStatusMessages,
  IntegrationTestFeedback,
} from "./integrationShared";
import { useApiKeyIntegration } from "./useApiKeyIntegration";

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

export type LinearSettingsView = "general" | "api-key" | "oauth";

const LINEAR_DEVELOPER_URL = "https://linear.app/settings/api/applications/new";

export function LinearIntegrationSection({
  activeView,
  issueLinkMode,
  groceryLinearProjectId,
  saving,
  onIssueLinkModeChange,
  onGroceryLinearProjectIdChange,
  onSecretsUpdated,
}: {
  activeView: LinearSettingsView;
  issueLinkMode: LinearIssueLinkMode;
  groceryLinearProjectId: string;
  saving: boolean;
  onIssueLinkModeChange: (value: LinearIssueLinkMode) => void;
  onGroceryLinearProjectIdChange: (value: string) => void;
  onSecretsUpdated?: () => void | Promise<void>;
}) {
  const integration = useApiKeyIntegration("linear", onSecretsUpdated);
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [clientIdDraft, setClientIdDraft] = useState("");
  const [clientSecretDraft, setClientSecretDraft] = useState("");
  const [credentialsTesting, setCredentialsTesting] = useState(false);
  const [credentialsTestResult, setCredentialsTestResult] = useState<
    IntegrationTestResult | undefined
  >();
  const [connecting, setConnecting] = useState(false);
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
  const credentialsConfigured = Boolean(linearOAuth?.credentialsConfigured);
  const hasCredentialDraft = Boolean(clientIdDraft.trim() || clientSecretDraft.trim());
  const canTestCredentialDraft =
    Boolean(clientIdDraft.trim()) && Boolean(clientSecretDraft.trim());
  const showSavedCredentialActions = credentialsConfigured && !hasCredentialDraft;
  const credentialsStepComplete = showSavedCredentialActions;
  const oauthBusy = credentialsTesting || connecting;
  const connectButtonDisabled = oauthBusy || !credentialsStepComplete;
  const credentialsTestEnabled =
    !oauthBusy && (canTestCredentialDraft || showSavedCredentialActions);

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7520/ingest/4580ffec-ea73-4c04-a5e5-8313ab77c6f6", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "556676" },
      body: JSON.stringify({
        sessionId: "556676",
        runId: "pre-fix",
        hypothesisId: "A-B-C",
        location: "LinearIntegrationSection.tsx:connectButtonState",
        message: "Connect button gate state",
        data: {
          connectButtonDisabled,
          oauthBusy,
          credentialsStepComplete,
          oauthFullyConnected,
          credentialsConfigured,
          hasCredentialDraft,
          showSavedCredentialActions,
          credentialsTestOk: credentialsTestResult?.ok ?? null,
          linearOAuthStatus: linearOAuth
            ? {
                credentialsConfigured: linearOAuth.credentialsConfigured,
                authenticated: linearOAuth.authenticated,
              }
            : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [
    connectButtonDisabled,
    oauthBusy,
    credentialsStepComplete,
    oauthFullyConnected,
    credentialsConfigured,
    hasCredentialDraft,
    showSavedCredentialActions,
    credentialsTestResult?.ok,
    linearOAuth,
  ]);

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
    // #region agent log
    fetch("http://127.0.0.1:7520/ingest/4580ffec-ea73-4c04-a5e5-8313ab77c6f6", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "556676" },
      body: JSON.stringify({
        sessionId: "556676",
        runId: "pre-fix",
        hypothesisId: "E",
        location: "LinearIntegrationSection.tsx:startBrowserConnect",
        message: "Connect handler invoked",
        data: { connectButtonDisabled },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
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
      const errorMessage = err instanceof Error ? err.message : "Failed to start Linear sign-in";
      // #region agent log
      fetch("http://127.0.0.1:7520/ingest/4580ffec-ea73-4c04-a5e5-8313ab77c6f6", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "556676" },
        body: JSON.stringify({
          sessionId: "556676",
          runId: "pre-fix",
          hypothesisId: "E",
          location: "LinearIntegrationSection.tsx:startBrowserConnect:catch",
          message: "Connect handler failed",
          data: { errorMessage },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      setOauthError(errorMessage);
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
        // #region agent log
        fetch("http://127.0.0.1:7520/ingest/4580ffec-ea73-4c04-a5e5-8313ab77c6f6", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "556676" },
          body: JSON.stringify({
            sessionId: "556676",
            runId: "post-fix-v2",
            hypothesisId: "F",
            location: "LinearIntegrationSection.tsx:handleTestCredentials:afterSave",
            message: "Credentials saved after test",
            data: {
              credentialsConfigured: next.linear.credentialsConfigured,
              clientIdConfigured: next.linear.clientId.configured,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
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
      // #region agent log
      fetch("http://127.0.0.1:7520/ingest/4580ffec-ea73-4c04-a5e5-8313ab77c6f6", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "556676" },
        body: JSON.stringify({
          sessionId: "556676",
          runId: "post-fix-v3",
          hypothesisId: "G",
          location: "LinearIntegrationSection.tsx:handleSaveCredentials:afterSave",
          message: "Save credentials API response",
          data: {
            credentialsConfigured: next.linear.credentialsConfigured,
            clientIdConfigured: next.linear.clientId.configured,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    } catch (err) {
      setOauthError(err instanceof Error ? err.message : "Failed to save OAuth credentials");
    } finally {
      setCredentialsTesting(false);
    }
  }

  const connected = status ? isLinearSettingsConnected(status) : integration.configured;

  return (
    <section className="settings-section">
      {activeView === "general" ? (
        <>
          <IntegrationStatusLine connected={connected} />

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
              onChange={onGroceryLinearProjectIdChange}
            />
          </div>
        </>
      ) : null}

      {activeView === "api-key" ? (
        <>
          <p className="settings-hint settings-hint-spaced-top">
            Required for Linear MCP tools and the grocery list automation when OAuth is not used.
            Keys are stored locally in <code>~/.backsteros-agent/.env</code>.
          </p>

          <ApiKeyField
            id="linear-api-key"
            label="API key"
            hint="Optional when OAuth is connected."
            value={integration.draft}
            configured={integration.configured}
            savedPreview={integration.savedPreview}
            unsetPlaceholder="lin_..."
            allowRemove
            testState={integration.testState}
            testResult={integration.testResult}
            saving={integration.saving}
            onChange={integration.updateDraft}
            onTest={() => {
              void integration.handleTest();
            }}
            onRemove={() => {
              void integration.handleRemove();
            }}
          />

          <IntegrationStatusMessages message={integration.message} error={integration.error} />
        </>
      ) : null}

      {activeView === "oauth" ? (
        <>
          <p className="settings-hint settings-hint-spaced-top">
            Create a Linear OAuth app and add the redirect URI below exactly as shown. Linear requires
            an exact match for <code>redirect_uri</code>. Secrets are stored locally in{" "}
            <code>~/.backsteros-agent/</code>.
          </p>

          <p className="settings-hint settings-hint-spaced">
            Primary redirect URI:{" "}
            <code className="settings-inline-code">{LINEAR_OAUTH_PRIMARY_REDIRECT_URI}</code>
          </p>
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
          </div>

          <h3 className="settings-subsection-title">Sign in with Linear</h3>
          <p className="settings-hint settings-hint-spaced-top">
            Opens your browser so you can authorize BacksterOS Agent to access your Linear account.
          </p>
          {!credentialsStepComplete ? (
            <p className="settings-hint settings-hint-spaced">
              Enter your OAuth client ID and secret above, then test them to enable sign-in.
            </p>
          ) : null}
          <div className="settings-row settings-row-actions">
            <button
              type="button"
              className="btn-primary"
              disabled={connectButtonDisabled}
              onPointerDown={(event) => {
                // #region agent log
                fetch("http://127.0.0.1:7520/ingest/4580ffec-ea73-4c04-a5e5-8313ab77c6f6", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "556676" },
                  body: JSON.stringify({
                    sessionId: "556676",
                    runId: "post-fix-v2",
                    hypothesisId: "F",
                    location: "LinearIntegrationSection.tsx:connectButton:pointerDown",
                    message: "Connect button pointer down",
                    data: {
                      connectButtonDisabled,
                      credentialsStepComplete,
                      buttonDisabled: (event.currentTarget as HTMLButtonElement).disabled,
                      pointerType: event.pointerType,
                    },
                    timestamp: Date.now(),
                  }),
                }).catch(() => {});
                // #endregion
              }}
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
          </div>

          <IntegrationStatusMessages message={oauthMessage} error={oauthError} />
        </>
      ) : null}
    </section>
  );
}
