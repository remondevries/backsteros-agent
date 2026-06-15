import { useCallback, useEffect, useState } from "react";
import type { AccountWorkspaceResponse } from "../chat/types";
import {
  deleteAccount,
  getAccountWorkspace,
  loginWithAccessToken,
  type IntegrationsStatus,
} from "../lib/api";
import { restartSidecarIfNeeded } from "../lib/restartSidecar";
import { IntegrationStatusMessages } from "./integrationShared";

function formatOptionalValue(value: string | null) {
  return value ?? "—";
}

export function ConnectionsCredentialsSection({
  saving,
  integrationsStatus,
  onSecretsUpdated,
  onServerAccessSaved,
  onAccountDeleted,
}: {
  saving: boolean;
  integrationsStatus: IntegrationsStatus | null;
  onSecretsUpdated?: () => void | Promise<void>;
  onServerAccessSaved?: () => void | Promise<void>;
  onAccountDeleted?: () => void | Promise<void>;
}) {
  const [serverAccessToken, setServerAccessToken] = useState("");
  const [serverAccessError, setServerAccessError] = useState<string | null>(null);
  const [serverAccessSaving, setServerAccessSaving] = useState(false);
  const [accountDeleting, setAccountDeleting] = useState(false);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [accountInfo, setAccountInfo] = useState<AccountWorkspaceResponse | null>(null);

  const cursorApiKeyConfigured = integrationsStatus?.cursorApiKey.configured ?? false;
  const linearOAuth = integrationsStatus?.linear;
  const linearOAuthRemovable = Boolean(
    linearOAuth?.authenticated || linearOAuth?.credentialsConfigured,
  );
  const hasRemovableCredentials =
    cursorApiKeyConfigured || linearOAuthRemovable;
  const canDeleteAccount = Boolean(accountInfo) || hasRemovableCredentials;

  const loadAccountInfo = useCallback(async () => {
    setAccountLoading(true);
    setAccountError(null);
    try {
      const account = await getAccountWorkspace();
      setAccountInfo(account);
    } catch (error) {
      setAccountInfo(null);
      setAccountError(
        error instanceof Error ? error.message : "Failed to load account details",
      );
    } finally {
      setAccountLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccountInfo();
  }, [loadAccountInfo]);

  async function handleDeleteAccount() {
    if (
      !window.confirm(
        "Delete your account data and remove stored API credentials? This cannot be undone.",
      )
    ) {
      return;
    }

    setAccountDeleting(true);
    setAccountError(null);
    setAccountMessage(null);
    try {
      const result = await deleteAccount();
      setAccountInfo(result);
      await restartSidecarIfNeeded();
      await onSecretsUpdated?.();
      await onAccountDeleted?.();
      const removedParts: string[] = [];
      if (result.credentialsRemoved) {
        removedParts.push("stored API credentials");
      }
      if (result.accountFileDeleted) {
        removedParts.push("account file");
      }
      setAccountMessage(
        removedParts.length > 0
          ? `Deleted ${removedParts.join(" and ")}.`
          : "Account data is already removed.",
      );
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "Failed to delete account");
    } finally {
      setAccountDeleting(false);
    }
  }

  return (
    <>
      <section className="settings-section">
        <p className="settings-hint settings-hint-spaced-top">
          Your Linear identity and the per-user account file stored on this server.
        </p>
        {accountLoading ? (
          <p className="settings-hint settings-hint-spaced-top">Loading account…</p>
        ) : accountInfo ? (
          <div className="settings-hint-spaced-top">
            <p className="settings-field-label">Name</p>
            <p className="settings-hint">{accountInfo.viewer.name}</p>
            <p className="settings-field-label settings-hint-spaced">Email</p>
            <p className="settings-hint">{formatOptionalValue(accountInfo.viewer.email)}</p>
            <p className="settings-field-label settings-hint-spaced">Linear user ID</p>
            <p className="settings-hint">{accountInfo.linearUserId}</p>
            <p className="settings-field-label settings-hint-spaced">Setup completed</p>
            <p className="settings-hint">
              {formatOptionalValue(accountInfo.workspace.setupCompletedAt)}
            </p>
          </div>
        ) : null}
        {!accountLoading ? (
          <>
            <div className="settings-row settings-row-profiles settings-hint-spaced">
              <button
                type="button"
                className="btn-secondary settings-integration-test-button settings-integration-test-button--remove"
                disabled={!canDeleteAccount || accountDeleting || saving}
                onClick={() => {
                  void handleDeleteAccount();
                }}
              >
                {accountDeleting ? "Deleting…" : "Delete account"}
              </button>
            </div>
            <IntegrationStatusMessages message={accountMessage} error={accountError} />
          </>
        ) : null}
      </section>

      {!import.meta.env.DEV && (
        <section className="settings-section">
          <h3 className="settings-subsection-title">Server access</h3>
          <p className="settings-hint settings-hint-spaced-top">
            Paste the server access token from your deployment to establish a signed-in session.
          </p>
          <label className="settings-field-label" htmlFor="server-access-token">
            Access token
          </label>
          <div className="settings-row">
            <input
              id="server-access-token"
              type="password"
              value={serverAccessToken}
              disabled={serverAccessSaving}
              placeholder="SIDECAR_TOKEN value"
              onChange={(event) => setServerAccessToken(event.target.value)}
            />
            <button
              type="button"
              className="btn-secondary"
              disabled={serverAccessSaving || !serverAccessToken.trim()}
              onClick={() => {
                setServerAccessSaving(true);
                setServerAccessError(null);
                void loginWithAccessToken(serverAccessToken.trim())
                  .then(() => {
                    setServerAccessToken("");
                    return onServerAccessSaved?.();
                  })
                  .catch((error) => {
                    setServerAccessError(
                      error instanceof Error ? error.message : "Failed to sign in",
                    );
                  })
                  .finally(() => setServerAccessSaving(false));
              }}
            >
              {serverAccessSaving ? "Signing in…" : "Sign in"}
            </button>
          </div>
          {serverAccessError ? (
            <p className="error-text settings-hint-spaced">{serverAccessError}</p>
          ) : null}
        </section>
      )}
    </>
  );
}
