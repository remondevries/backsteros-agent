import { useState } from "react";
import { loginWithAccessToken } from "../lib/api";

export function ConnectGateServerAccess({
  onSignedIn,
}: {
  onSignedIn?: () => void | Promise<void>;
}) {
  const [serverAccessToken, setServerAccessToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (import.meta.env.DEV) {
    return null;
  }

  return (
    <section className="linear-connect-gate-section">
      <h2 className="settings-subsection-title">Server access</h2>
      <p className="settings-hint settings-hint-spaced-top">
        Paste the server access token from your deployment (<code className="settings-inline-code">SIDECAR_TOKEN</code>)
        before saving integration credentials.
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
          onChange={(event) => setServerAccessToken(event.target.value)}
        />
        <button
          type="button"
          className="btn-secondary"
          disabled={saving || !serverAccessToken.trim()}
          onClick={() => {
            setSaving(true);
            setError(null);
            void loginWithAccessToken(serverAccessToken.trim())
              .then(() => {
                setServerAccessToken("");
                return onSignedIn?.();
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
