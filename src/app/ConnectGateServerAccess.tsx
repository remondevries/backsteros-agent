import { useCallback, useEffect, useState } from "react";
import { getAuthStatus, loginWithAccessToken } from "../lib/api";

export function ConnectGateServerAccess({
  onSignedIn,
}: {
  onSignedIn?: () => void | Promise<void>;
}) {
  const [serverAccessToken, setServerAccessToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const refreshAuthStatus = useCallback(async () => {
    setChecking(true);
    try {
      const status = await getAuthStatus();
      setAuthenticated(status.authenticated);
      if (status.authenticated) {
        setSuccessMessage("Signed in. Continue with Linear OAuth below.");
      }
    } catch {
      setAuthenticated(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV) {
      setChecking(false);
      return;
    }
    void refreshAuthStatus();
  }, [refreshAuthStatus]);

  if (import.meta.env.DEV) {
    return null;
  }

  if (checking) {
    return (
      <section className="linear-connect-gate-section">
        <p className="settings-hint">Checking server access…</p>
      </section>
    );
  }

  if (authenticated) {
    return (
      <section className="linear-connect-gate-section">
        <h2 className="settings-subsection-title">Server access</h2>
        <p className="settings-hint settings-hint-spaced-top">
          {successMessage ?? "Signed in. Continue with Linear OAuth below."}
        </p>
      </section>
    );
  }

  return (
    <section className="linear-connect-gate-section">
      <h2 className="settings-subsection-title">Server access</h2>
      <p className="settings-hint settings-hint-spaced-top">
        Paste the server access token from your deployment (
        <code className="settings-inline-code">SIDECAR_TOKEN</code>
        ). Do not include spaces before or after the token.
      </p>
      <label className="settings-field-label" htmlFor="connect-gate-server-access-token">
        Access token
      </label>
      <div className="settings-row">
        <input
          id="connect-gate-server-access-token"
          type="password"
          value={serverAccessToken}
          disabled={saving}
          placeholder="SIDECAR_TOKEN value"
          autoComplete="off"
          onChange={(event) => setServerAccessToken(event.target.value)}
        />
        <button
          type="button"
          className="btn-secondary"
          disabled={saving || !serverAccessToken.trim()}
          onClick={() => {
            setSaving(true);
            setError(null);
            setSuccessMessage(null);
            void loginWithAccessToken(serverAccessToken.trim())
              .then(async () => {
                setServerAccessToken("");
                setAuthenticated(true);
                setSuccessMessage("Signed in. Continue with Linear OAuth below.");
                await onSignedIn?.();
              })
              .catch((signInError) => {
                setError(
                  signInError instanceof Error ? signInError.message : "Failed to sign in",
                );
              })
              .finally(() => setSaving(false));
          }}
        >
          {saving ? "Signing in…" : "Sign in"}
        </button>
      </div>
      {error ? <p className="error-text settings-hint-spaced">{error}</p> : null}
    </section>
  );
}
