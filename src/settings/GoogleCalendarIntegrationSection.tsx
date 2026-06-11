import { useCallback, useEffect, useState } from "react";
import {
  getIntegrationsStatus,
  runIntegrationTest,
  saveGoogleCalendarCredentials,
  type IntegrationTestResult,
  type IntegrationsStatus,
} from "../lib/api";
import { connectGoogleCalendarAndWait } from "../lib/googleCalendarConnect";
import { openExternalUrl } from "../lib/openExternalUrl";
import { restartSidecarIfNeeded } from "../lib/restartSidecar";
import {
  getGoogleCalendarStatusLabel,
  isGoogleCalendarConnected,
} from "./integrationConnectionStatus";
import {
  IntegrationSecretInput,
  IntegrationStatusMessages,
  IntegrationTestFeedback,
} from "./integrationShared";

const GOOGLE_CLOUD_CREDENTIALS_URL = "https://console.cloud.google.com/apis/credentials";

export function GoogleCalendarIntegrationSection({
  onSecretsUpdated,
}: {
  onSecretsUpdated?: () => void | Promise<void>;
}) {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [clientIdDraft, setClientIdDraft] = useState("");
  const [clientSecretDraft, setClientSecretDraft] = useState("");
  const [credentialsTesting, setCredentialsTesting] = useState(false);
  const [credentialsTestResult, setCredentialsTestResult] = useState<IntegrationTestResult | undefined>();
  const [calendarTesting, setCalendarTesting] = useState(false);
  const [calendarTestResult, setCalendarTestResult] = useState<IntegrationTestResult | undefined>();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const next = await getIntegrationsStatus();
    setStatus(next);
  }, []);

  useEffect(() => {
    void loadStatus().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load integration status");
    });
  }, [loadStatus]);

  const calendar = status?.googleCalendar;
  const fullyConnected = calendar ? isGoogleCalendarConnected(calendar) : false;
  const credentialsConfigured = Boolean(calendar?.credentialsConfigured);
  const clientIdConfigured = Boolean(calendar?.clientId.configured);
  const clientSecretConfigured = Boolean(calendar?.clientSecret.configured);
  const hasCredentialDraft = Boolean(clientIdDraft.trim() || clientSecretDraft.trim());
  const canTestCredentialDraft =
    Boolean(clientIdDraft.trim()) && Boolean(clientSecretDraft.trim());
  const showSavedCredentialActions = credentialsConfigured && !hasCredentialDraft;
  const credentialsStepComplete =
    showSavedCredentialActions && credentialsTestResult?.ok === true;
  const busy = credentialsTesting || connecting || calendarTesting;

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
    setError(null);
    setMessage(null);
    setCalendarTestResult(undefined);
    try {
      const result = await connectGoogleCalendarAndWait();
      await loadStatus();
      await onSecretsUpdated?.();
      if (result.connected) {
        setMessage("Google Calendar connected.");
      } else if (result.message) {
        setMessage(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start Google Calendar sign-in");
    } finally {
      setConnecting(false);
    }
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
        "googleCalendarCredentials",
        canTestCredentialDraft
          ? {
              googleOAuthClientId: trimmedClientId,
              googleOAuthClientSecret: trimmedClientSecret,
            }
          : undefined,
      );

      if (!result.ok) {
        setCredentialsTestResult(result);
        return;
      }

      if (canTestCredentialDraft) {
        const next = await saveGoogleCalendarCredentials({
          clientId: trimmedClientId,
          clientSecret: trimmedClientSecret,
        });
        setStatus(next);
        resetCredentialDrafts();
        await restartSidecarIfNeeded();
        await onSecretsUpdated?.();
        setMessage("Google OAuth credentials saved.");
      }

      setCredentialsTestResult(result);
    } catch (err) {
      setCredentialsTestResult({
        ok: false,
        message: err instanceof Error ? err.message : "Credential test failed",
      });
    } finally {
      setCredentialsTesting(false);
    }
  }

  async function handleRemoveCredentials() {
    setCredentialsTesting(true);
    setError(null);
    setMessage(null);
    try {
      const next = await saveGoogleCalendarCredentials({ clear: true });
      setStatus(next);
      resetCredentialDrafts();
      resetCredentialsTest();
      setCalendarTestResult(undefined);
      await restartSidecarIfNeeded();
      await onSecretsUpdated?.();
      setMessage("Google OAuth credentials removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove Google OAuth credentials");
    } finally {
      setCredentialsTesting(false);
    }
  }

  async function handleCalendarTest() {
    setCalendarTesting(true);
    setError(null);
    try {
      const result = await runIntegrationTest("googleCalendar");
      setCalendarTestResult(result);
    } catch (err) {
      setCalendarTestResult({
        ok: false,
        message: err instanceof Error ? err.message : "Integration test failed",
      });
    } finally {
      setCalendarTesting(false);
    }
  }

  const credentialsTestEnabled =
    !busy && (canTestCredentialDraft || showSavedCredentialActions);

  return (
    <section className="settings-section">
      <p className="settings-hint settings-hint-spaced-top">
        Connect Google Calendar for morning review and scheduling tools. Credentials and tokens are
        stored locally on this machine.
      </p>
      <p className="settings-hint">
        Status:{" "}
        <strong>{status ? getGoogleCalendarStatusLabel(status.googleCalendar) : "Loading…"}</strong>
      </p>

      <h3 className="settings-subsection-title">1. OAuth app credentials</h3>
      <p className="settings-hint settings-hint-spaced-top">
        Create a Google Cloud OAuth <strong>Desktop app</strong> with the Calendar API enabled, then
        paste the client ID and secret here.{" "}
        <a
          href={GOOGLE_CLOUD_CREDENTIALS_URL}
          onClick={(event) => {
            event.preventDefault();
            void openExternalUrl(GOOGLE_CLOUD_CREDENTIALS_URL);
          }}
        >
          Open Google Cloud credentials
        </a>
        .
      </p>

      <IntegrationSecretInput
        id="google-oauth-client-id"
        label="Client ID"
        hint="Ends with .apps.googleusercontent.com"
        value={clientIdDraft}
        configured={clientIdConfigured}
        savedPreview={calendar?.clientId.preview}
        unsetPlaceholder="1234567890-abc.apps.googleusercontent.com"
        inputType="text"
        disabled={busy}
        onChange={updateClientIdDraft}
      />

      <IntegrationSecretInput
        id="google-oauth-client-secret"
        label="Client secret"
        value={clientSecretDraft}
        configured={clientSecretConfigured}
        savedPreview={calendar?.clientSecret.preview}
        unsetPlaceholder="GOCSPX-..."
        disabled={busy}
        onChange={updateClientSecretDraft}
      />

      <div className="settings-row settings-row-profiles">
        {(canTestCredentialDraft || showSavedCredentialActions) && (
          <button
            type="button"
            className="btn-secondary settings-integration-test-button"
            disabled={!credentialsTestEnabled}
            onClick={() => {
              void handleTestCredentials();
            }}
          >
            {credentialsTesting ? "Testing…" : "Test"}
          </button>
        )}
        {showSavedCredentialActions && (
          <button
            type="button"
            className="btn-secondary settings-integration-test-button settings-integration-test-button--remove"
            disabled={busy}
            onClick={() => {
              void handleRemoveCredentials();
            }}
          >
            Remove
          </button>
        )}
      </div>

      <IntegrationTestFeedback result={credentialsTestResult} />

      {credentialsStepComplete && (
        <>
          <h3 className="settings-subsection-title">2. Sign in with Google</h3>
          <p className="settings-hint settings-hint-spaced-top">
            Opens your browser so you can authorize Backster to access your calendar.
          </p>
          <div className="settings-row settings-row-profiles">
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => {
                void startBrowserConnect();
              }}
            >
              {connecting
                ? "Opening browser…"
                : fullyConnected
                  ? "Reconnect"
                  : "Connect Google Calendar"}
            </button>
          </div>
        </>
      )}

      {fullyConnected && (
        <>
          <div className="settings-row settings-row-profiles">
            <button
              type="button"
              className="btn-secondary settings-integration-test-button"
              disabled={busy}
              onClick={() => {
                void handleCalendarTest();
              }}
            >
              {calendarTesting ? "Testing…" : "Test connection"}
            </button>
          </div>
          <IntegrationTestFeedback result={calendarTestResult} />
        </>
      )}

      <IntegrationStatusMessages message={message} error={error} />
    </section>
  );
}
