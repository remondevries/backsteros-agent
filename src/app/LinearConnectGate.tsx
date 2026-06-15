import { useCallback, useEffect, useState } from "react";
import {
  getIntegrationsStatus,
  runIntegrationTest,
  saveLinearOAuthCredentials,
  type IntegrationsStatus,
  type IntegrationTestResult,
} from "../lib/api";
import { connectLinearOAuthAndWait } from "../lib/linearConnect";
import {
  getLinearOAuthRedirectUris,
  getLinearOAuthPrimaryRedirectUri,
  usesPublicLinearOAuthRedirect,
} from "../lib/linearOAuthRedirect";
import { openExternalUrl } from "../lib/openExternalUrl";
import { restartSidecarIfNeeded } from "../lib/restartSidecar";
import { BOOTSTRAP_CHECKING_MESSAGE } from "../lib/sidecarBootstrap";
import { isLinearOAuthConnected } from "../settings/integrationConnectionStatus";
import { ConnectGateShell } from "./ConnectGateShell";
import { ConnectGateServerAccess } from "./ConnectGateServerAccess";
import type { ConnectGateProgressStep } from "./ConnectGateProgress";
import {
  IntegrationSecretInput,
  IntegrationStatusMessages,
  IntegrationTestFeedback,
} from "../settings/integrationShared";

const LINEAR_DEVELOPER_URL = "https://linear.app/settings/api/applications/new";

export function LinearConnectGate({
  onOAuthSuccess,
  bootstrapMessage = null,
  bootstrapRetrying = false,
  onBootstrapRetry,
  onServerAccessSignedIn,
  showCursorStepOption = false,
  cursorStepComplete = false,
  onAdvanceToCursor,
}: {
  onOAuthSuccess: () => void | Promise<void>;
  bootstrapMessage?: string | null;
  bootstrapRetrying?: boolean;
  onBootstrapRetry?: () => void;
  onServerAccessSignedIn?: () => void | Promise<void>;
  showCursorStepOption?: boolean;
  cursorStepComplete?: boolean;
  onAdvanceToCursor?: () => void;
}) {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [clientIdDraft, setClientIdDraft] = useState("");
  const [clientSecretDraft, setClientSecretDraft] = useState("");
  const [credentialsTesting, setCredentialsTesting] = useState(false);
  const [credentialsTestResult, setCredentialsTestResult] = useState<
    IntegrationTestResult | undefined
  >();
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const next = await getIntegrationsStatus();
    setStatus(next);
    return next;
  }, []);

  const handleServerAccessSignedIn = useCallback(async () => {
    setError(null);
    setMessage("Signed in. Continue with Linear OAuth below.");
    setLoadingStatus(true);
    try {
      await loadStatus();
      await onServerAccessSignedIn?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load integration status");
    } finally {
      setLoadingStatus(false);
    }
  }, [loadStatus, onServerAccessSignedIn]);

  const bootstrapBlocking = Boolean(bootstrapMessage);
  const needsServerAccessSignIn = bootstrapMessage
    ?.toLowerCase()
    .includes("server access");

  useEffect(() => {
    if (bootstrapBlocking) {
      return;
    }
    void loadStatus()
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load integration status");
      })
      .finally(() => setLoadingStatus(false));
  }, [bootstrapBlocking, loadStatus]);

  const linearOAuth = status?.linear;
  const oauthFullyConnected = linearOAuth ? isLinearOAuthConnected(linearOAuth) : false;
  const hasCredentialDraft = Boolean(clientIdDraft.trim() || clientSecretDraft.trim());
  const canTestCredentialDraft =
    Boolean(clientIdDraft.trim()) && Boolean(clientSecretDraft.trim());
  const showSavedCredentialActions =
    Boolean(linearOAuth?.credentialsConfigured) && !hasCredentialDraft;
  const credentialsStepComplete = showSavedCredentialActions;
  const oauthBusy = credentialsTesting || connecting;
  const connectButtonDisabled = oauthBusy || !credentialsStepComplete;
  const credentialsTestEnabled =
    !oauthBusy && (canTestCredentialDraft || showSavedCredentialActions);
  const simpleSignInOnly = Boolean(linearOAuth?.credentialsConfigured);
  const canOpenCursorStep = oauthFullyConnected && showCursorStepOption;

  function resetCredentialsTest() {
    setCredentialsTestResult(undefined);
  }

  async function handleTestCredentials() {
    setCredentialsTesting(true);
    setError(null);
    setMessage(null);
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
        setClientIdDraft("");
        setClientSecretDraft("");
        await restartSidecarIfNeeded();
        setMessage("Linear OAuth credentials saved.");
      }

      setCredentialsTestResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to test OAuth credentials");
    } finally {
      setCredentialsTesting(false);
    }
  }

  async function startBrowserConnect() {
    setConnecting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await connectLinearOAuthAndWait();
      await loadStatus();
      if (result.connected) {
        await onOAuthSuccess();
        return;
      }
      if (result.message) {
        setMessage(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start Linear sign-in");
    } finally {
      setConnecting(false);
    }
  }

  const connectTitle = "Connect to Linear";
  const connectDescription = simpleSignInOnly
    ? "Sign in with Linear to continue. BacksterOS needs access to your workspace issues before anything else loads."
    : "Sign in with Linear to access BacksterOS Agent. Your workspace data stays in Linear — we only request the scopes needed to read and update issues on your behalf.";

  const progressProps = {
    progressStep: "linear" as const,
    linearStepComplete: oauthFullyConnected,
    cursorStepComplete,
    onProgressStepClick: canOpenCursorStep
      ? (step: ConnectGateProgressStep) => {
          if (step === "cursor") {
            onAdvanceToCursor?.();
          }
        }
      : undefined,
  };

  const connectedActions = canOpenCursorStep ? (
    <>
      <button
        type="button"
        className="btn-primary linear-connect-gate-primary"
        disabled={oauthBusy}
        onClick={() => {
          void startBrowserConnect();
        }}
      >
        {connecting ? "Waiting for sign-in…" : "Reconnect"}
      </button>
      <button
        type="button"
        className="btn-secondary settings-integration-test-button"
        disabled={oauthBusy}
        onClick={() => {
          onAdvanceToCursor?.();
        }}
      >
        Next step
      </button>
    </>
  ) : (
    <button
      type="button"
      className="btn-primary linear-connect-gate-primary"
      disabled={oauthBusy}
      onClick={() => {
        void startBrowserConnect();
      }}
    >
      {connecting ? "Waiting for sign-in…" : "Reconnect"}
    </button>
  );

  if (bootstrapBlocking) {
    const checking = bootstrapMessage === BOOTSTRAP_CHECKING_MESSAGE;
    return (
      <ConnectGateShell
        brand="backster-linear"
        title={connectTitle}
        description={bootstrapMessage ?? undefined}
        {...progressProps}
      >
        {needsServerAccessSignIn ? (
          <ConnectGateServerAccess onSignedIn={handleServerAccessSignedIn} />
        ) : null}
        {!checking && onBootstrapRetry ? (
          <div className="linear-connect-gate-actions">
            <button
              type="button"
              className="btn-secondary"
              disabled={bootstrapRetrying}
              onClick={onBootstrapRetry}
            >
              {bootstrapRetrying ? "Retrying…" : "Retry connection"}
            </button>
          </div>
        ) : null}
      </ConnectGateShell>
    );
  }

  if (simpleSignInOnly) {
    return (
      <ConnectGateShell
        brand="backster-linear"
        integrationConnected={oauthFullyConnected}
        title={connectTitle}
        description={loadingStatus ? "Loading…" : connectDescription}
        {...progressProps}
      >
        {!loadingStatus ? (
          <>
            <ConnectGateServerAccess
              onSignedIn={handleServerAccessSignedIn}
            />
            <div
              className={[
                "linear-connect-gate-actions",
                oauthFullyConnected && canOpenCursorStep && "linear-connect-gate-actions--split",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {oauthFullyConnected ? (
                connectedActions
              ) : (
                <button
                  type="button"
                  className="btn-primary linear-connect-gate-primary"
                  disabled={connectButtonDisabled}
                  onClick={() => {
                    void startBrowserConnect();
                  }}
                >
                  {connecting ? "Waiting for sign-in…" : "Continue with Linear"}
                </button>
              )}
            </div>
            <IntegrationStatusMessages message={message} error={error} />
          </>
        ) : null}
      </ConnectGateShell>
    );
  }

  return (
    <ConnectGateShell
      brand="backster-linear"
      title={connectTitle}
      description={connectDescription}
      {...progressProps}
    >
      <div className="linear-connect-gate-body">
        {loadingStatus ? (
          <p className="settings-hint">Loading…</p>
        ) : (
          <>
            <ConnectGateServerAccess
              onSignedIn={handleServerAccessSignedIn}
            />
            <section className="linear-connect-gate-section">
              <h2 className="settings-subsection-title">1. OAuth application</h2>
              <p className="settings-hint settings-hint-spaced-top">
                Create a Linear OAuth app and register this redirect URI exactly:
              </p>
              <p className="settings-hint settings-hint-spaced">
                <code className="settings-inline-code">{getLinearOAuthPrimaryRedirectUri()}</code>
              </p>
              {!usesPublicLinearOAuthRedirect() ? (
                <>
                  <p className="settings-hint">
                    If port 3510 is in use, BacksterOS may use 3511–3515. Register those URIs too if
                    sign-in fails:
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
              <p className="settings-hint">
                <button
                  type="button"
                  className="settings-inline-link"
                  onClick={() => {
                    void openExternalUrl(LINEAR_DEVELOPER_URL);
                  }}
                >
                  Create OAuth app in Linear
                </button>
              </p>

              <IntegrationSecretInput
                id="linear-connect-client-id"
                label="Client ID"
                value={clientIdDraft}
                configured={Boolean(linearOAuth?.clientId.configured)}
                savedPreview={linearOAuth?.clientId.preview}
                unsetPlaceholder="Linear OAuth client ID"
                inputType="text"
                disabled={oauthBusy}
                onChange={(value) => {
                  setClientIdDraft(value);
                  resetCredentialsTest();
                }}
              />

              <IntegrationSecretInput
                id="linear-connect-client-secret"
                label="Client secret"
                value={clientSecretDraft}
                configured={Boolean(linearOAuth?.clientSecret.configured)}
                savedPreview={linearOAuth?.clientSecret.preview}
                unsetPlaceholder="Linear OAuth client secret"
                disabled={oauthBusy}
                onChange={(value) => {
                  setClientSecretDraft(value);
                  resetCredentialsTest();
                }}
              />

              <IntegrationTestFeedback result={credentialsTestResult} />

              {(canTestCredentialDraft || showSavedCredentialActions) && (
                <div className="settings-row settings-row-actions">
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
                </div>
              )}
            </section>

            {credentialsStepComplete ? (
              <section className="linear-connect-gate-section">
                <h2 className="settings-subsection-title">2. Sign in with Linear</h2>
                <p className="settings-hint settings-hint-spaced-top">
                  Opens your browser to authorize BacksterOS Agent. When you see the success page,
                  return here — the app will open automatically.
                </p>
                <div className="settings-row settings-row-actions">
                  {oauthFullyConnected ? (
                    <button
                      type="button"
                      className="btn-primary linear-connect-gate-primary"
                      disabled={oauthBusy}
                      onClick={() => {
                        void startBrowserConnect();
                      }}
                    >
                      {connecting ? "Waiting for sign-in…" : "Reconnect"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary linear-connect-gate-primary"
                      disabled={connectButtonDisabled}
                      onClick={() => {
                        void startBrowserConnect();
                      }}
                    >
                      {connecting ? "Waiting for sign-in…" : "Continue with Linear"}
                    </button>
                  )}
                </div>
              </section>
            ) : null}

            <IntegrationStatusMessages message={message} error={error} />
          </>
        )}
      </div>
    </ConnectGateShell>
  );
}
