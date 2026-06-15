import { useCallback, useEffect, useState } from "react";
import {
  completeWhoopAuthMfa,
  fetchWhoopToday,
  getIntegrationsStatus,
  saveWhoopCredentials,
  startWhoopAuth,
  type IntegrationsStatus,
} from "../lib/api";
import { restartSidecarIfNeeded } from "../lib/restartSidecar";
import {
  getWhoopStatusLabel,
  isWhoopConnected,
} from "./integrationConnectionStatus";
import {
  IntegrationSecretInput,
  IntegrationStatusLine,
  IntegrationStatusMessages,
  IntegrationTestFeedback,
} from "./integrationShared";

export function WhoopIntegrationSection({
  onSecretsUpdated,
}: {
  onSecretsUpdated?: () => void | Promise<void>;
}) {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [verifyingMfa, setVerifyingMfa] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testOk, setTestOk] = useState<boolean | undefined>();
  const [testMessage, setTestMessage] = useState<string | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [authSessionId, setAuthSessionId] = useState<string | null>(null);
  const [showManualTokens, setShowManualTokens] = useState(false);
  const [iosBearerToken, setIosBearerToken] = useState("");
  const [cognitoRefreshToken, setCognitoRefreshToken] = useState("");
  const [userId, setUserId] = useState("");
  const [installationId, setInstallationId] = useState("");
  const [savingTokens, setSavingTokens] = useState(false);

  const loadStatus = useCallback(async () => {
    const next = await getIntegrationsStatus();
    setStatus(next);
  }, []);

  useEffect(() => {
    void loadStatus().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load Whoop status");
    });
  }, [loadStatus]);

  const whoop = status?.whoop;
  const connected = whoop ? isWhoopConnected(whoop) : false;
  const busy = signingIn || verifyingMfa || testing || savingTokens;

  async function handleSignIn() {
    setSigningIn(true);
    setError(null);
    setMessage(null);
    setTestOk(undefined);
    setTestMessage(undefined);
    setAuthSessionId(null);
    try {
      const result = await startWhoopAuth(email, password);
      setPassword("");
      if (result.status === "connected") {
        setMfaCode("");
        await loadStatus();
        await onSecretsUpdated?.();
        setMessage("Whoop connected. Test the connection to load today's snapshot.");
        return;
      }
      setAuthSessionId(result.authSessionId);
      setMessage(
        result.challengeName === "SMS_MFA"
          ? "Enter the SMS code Whoop sent to your phone."
          : "Enter the verification code from your authenticator app.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Whoop sign-in failed");
    } finally {
      setSigningIn(false);
    }
  }

  async function handleVerifyMfa() {
    if (!authSessionId) return;
    setVerifyingMfa(true);
    setError(null);
    setMessage(null);
    setTestOk(undefined);
    setTestMessage(undefined);
    try {
      await completeWhoopAuthMfa(authSessionId, mfaCode);
      setAuthSessionId(null);
      setMfaCode("");
      await loadStatus();
      await onSecretsUpdated?.();
      setMessage("Whoop connected. Test the connection to load today's snapshot.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Whoop MFA verification failed");
    } finally {
      setVerifyingMfa(false);
    }
  }

  async function handleSaveTokens() {
    setSavingTokens(true);
    setError(null);
    setMessage(null);
    setTestOk(undefined);
    setTestMessage(undefined);
    try {
      await saveWhoopCredentials({
        email: email || null,
        iosBearerToken: iosBearerToken || null,
        cognitoRefreshToken: cognitoRefreshToken || null,
        userId: userId || null,
        installationId: installationId || null,
      });
      setIosBearerToken("");
      setCognitoRefreshToken("");
      setUserId("");
      setInstallationId("");
      await loadStatus();
      await onSecretsUpdated?.();
      setMessage("Whoop tokens saved. Test the connection to verify.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save Whoop tokens");
    } finally {
      setSavingTokens(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setError(null);
    setMessage(null);
    setTestOk(undefined);
    setTestMessage(undefined);
    try {
      await restartSidecarIfNeeded();
      const result = await fetchWhoopToday({ force: true });
      await loadStatus();
      await onSecretsUpdated?.();
      if (result.authenticated && result.snapshot) {
        setTestOk(true);
        setTestMessage("Connected — today's Whoop snapshot loaded.");
        setMessage("Whoop is connected.");
        return;
      }
      if (result.error) {
        setTestOk(false);
        setTestMessage(result.error);
        return;
      }
      setTestOk(false);
      setTestMessage("Whoop is not connected yet. Sign in above or paste tokens manually.");
    } catch (err) {
      setTestOk(false);
      setTestMessage(err instanceof Error ? err.message : "Whoop connection test failed");
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="settings-section">
      <p className="settings-hint settings-hint-spaced-top">
        Sign in with your Whoop account to load recovery, sleep, and strain in daily notes, morning
        review, and chat. Tokens are stored in{" "}
        <code>{whoop?.envPath ?? "~/.backsteros-agent/totem.env"}</code>.
      </p>
      <p className="settings-hint settings-hint-spaced">
        Your password is used only for sign-in and is never saved. If your account uses MFA, you will
        be prompted for the code after signing in.
      </p>

      <IntegrationStatusLine connected={connected} />
      {!connected && whoop ? (
        <p className="settings-hint settings-hint-spaced">{getWhoopStatusLabel(whoop)}</p>
      ) : null}

      <div className="settings-hint-spaced">
        <IntegrationSecretInput
          id="whoop-email"
          label="Whoop email"
          value={email}
          configured={connected}
          unsetPlaceholder="you@example.com"
          inputType="text"
          disabled={busy || Boolean(authSessionId)}
          onChange={setEmail}
        />
        {!connected && !authSessionId ? (
          <IntegrationSecretInput
            id="whoop-password"
            label="Whoop password"
            hint="Sent to the server only for sign-in — not stored."
            value={password}
            configured={false}
            unsetPlaceholder="Your Whoop password"
            disabled={busy}
            onChange={setPassword}
          />
        ) : null}
        {authSessionId ? (
          <>
            <IntegrationSecretInput
              id="whoop-mfa-code"
              label="Verification code"
              value={mfaCode}
              configured={false}
              unsetPlaceholder="6-digit code"
              inputType="text"
              disabled={busy}
              onChange={setMfaCode}
            />
            <div className="settings-row settings-row-profiles">
              <button
                type="button"
                className="btn-secondary"
                disabled={busy || !mfaCode.trim()}
                onClick={() => {
                  void handleVerifyMfa();
                }}
              >
                {verifyingMfa ? "Verifying…" : "Verify code"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={busy}
                onClick={() => {
                  setAuthSessionId(null);
                  setMfaCode("");
                  setMessage(null);
                  setError(null);
                }}
              >
                Cancel
              </button>
            </div>
          </>
        ) : null}
      </div>

      {!connected && !authSessionId ? (
        <div className="settings-row settings-row-profiles settings-hint-spaced">
          <button
            type="button"
            className="btn-secondary"
            disabled={busy || !email.trim() || !password.trim()}
            onClick={() => {
              void handleSignIn();
            }}
          >
            {signingIn ? "Signing in…" : "Sign in to Whoop"}
          </button>
          <button
            type="button"
            className="btn-secondary settings-integration-test-button"
            disabled={busy || !whoop?.configured}
            onClick={() => {
              void handleTestConnection();
            }}
          >
            {testing ? "Testing…" : "Test connection"}
          </button>
        </div>
      ) : null}

      {connected ? (
        <div className="settings-row settings-row-profiles settings-hint-spaced">
          <button
            type="button"
            className="btn-secondary settings-integration-test-button"
            disabled={busy}
            onClick={() => {
              void handleTestConnection();
            }}
          >
            {testing ? "Testing…" : "Test connection"}
          </button>
        </div>
      ) : null}

      <details
        className="settings-hint-spaced"
        open={showManualTokens}
        onToggle={(event) => {
          setShowManualTokens((event.currentTarget as HTMLDetailsElement).open);
        }}
      >
        <summary className="settings-hint">Advanced: paste tokens manually</summary>
        <p className="settings-hint settings-hint-spaced">
          Only if you already have tokens from another Totem install. Otherwise use sign-in above.
        </p>
        <div className="settings-hint-spaced">
          <IntegrationSecretInput
            id="whoop-ios-bearer-token"
            label="WHOOP_IOS_BEARER_TOKEN"
            value={iosBearerToken}
            configured={connected}
            unsetPlaceholder="Optional manual paste"
            disabled={busy}
            onChange={setIosBearerToken}
          />
          <IntegrationSecretInput
            id="whoop-cognito-refresh-token"
            label="WHOOP_COGNITO_REFRESH_TOKEN"
            value={cognitoRefreshToken}
            configured={connected}
            unsetPlaceholder="Optional manual paste"
            disabled={busy}
            onChange={setCognitoRefreshToken}
          />
          <IntegrationSecretInput
            id="whoop-user-id"
            label="WHOOP_USER_ID"
            value={userId}
            configured={connected}
            unsetPlaceholder="Optional"
            disabled={busy}
            onChange={setUserId}
          />
          <IntegrationSecretInput
            id="whoop-installation-id"
            label="WHOOP_INSTALLATION_ID"
            value={installationId}
            configured={connected}
            unsetPlaceholder="Optional"
            disabled={busy}
            onChange={setInstallationId}
          />
        </div>
        <div className="settings-row settings-row-profiles settings-hint-spaced">
          <button
            type="button"
            className="btn-secondary"
            disabled={
              busy ||
              (!email.trim() && !iosBearerToken.trim() && !cognitoRefreshToken.trim())
            }
            onClick={() => {
              void handleSaveTokens();
            }}
          >
            {savingTokens ? "Saving…" : "Save tokens"}
          </button>
        </div>
      </details>

      <IntegrationTestFeedback
        result={
          testOk === undefined
            ? undefined
            : { ok: testOk, message: testMessage ?? (testOk ? "Connected." : "Test failed.") }
        }
      />
      <IntegrationStatusMessages message={message} error={error} />
    </section>
  );
}
