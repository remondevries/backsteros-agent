import { useCallback, useEffect, useState } from "react";
import type { StoredUserAccountSummary } from "../chat/types";
import { deleteAdminUserAccount, listAdminUserAccounts } from "../lib/api";

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M2.75 4.5h10.5M6.25 4.5V3.25a.75.75 0 0 1 .75-.75h2a.75.75 0 0 1 .75.75V4.5m1.5 0v8.25a.75.75 0 0 1-.75.75h-5.5a.75.75 0 0 1-.75-.75V4.5h7.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.25"
      />
    </svg>
  );
}

function formatTimestamp(value: string | null) {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleString();
}

export function AdministratorUserManagementSection() {
  const [accounts, setAccounts] = useState<StoredUserAccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listAdminUserAccounts();
      setAccounts(result.accounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user accounts");
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  async function handleDelete(linearUserId: string) {
    if (
      !window.confirm(
        `Delete the account file for ${linearUserId}? This removes stored workspace setup for that user on this server.`,
      )
    ) {
      return;
    }

    setDeletingUserId(linearUserId);
    setError(null);
    setMessage(null);
    try {
      const result = await deleteAdminUserAccount(linearUserId);
      if (result.deleted) {
        setMessage(`Deleted account file for ${linearUserId}.`);
      } else {
        setMessage(`No account file found for ${linearUserId}.`);
      }
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user account");
    } finally {
      setDeletingUserId(null);
    }
  }

  return (
    <section className="settings-section">
      <p className="settings-hint settings-hint-spaced-top">
        All per-user account JSON files on this server. Each file stores workspace setup for one
        Linear user. Deleting a file does not remove API keys or OAuth tokens for that user.
      </p>
      <div className="settings-user-accounts-toolbar settings-hint-spaced-top">
        <p className="settings-hint">
          {loading ? "Loading…" : `${accounts.length} account file${accounts.length === 1 ? "" : "s"}`}
        </p>
        <button
          type="button"
          className="btn-secondary settings-user-accounts-refresh"
          disabled={loading}
          onClick={() => {
            void loadAccounts();
          }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="settings-hint settings-hint-spaced">Loading accounts…</p>
      ) : accounts.length === 0 ? (
        <p className="settings-hint settings-hint-spaced">No account files found on this server.</p>
      ) : (
        <div className="settings-user-accounts-table settings-hint-spaced">
          <table>
            <thead>
              <tr>
                <th>Linear user ID</th>
                <th>Setup completed</th>
                <th>Last updated</th>
                <th>Account file</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.linearUserId}>
                  <td>
                    <code className="settings-inline-code">{account.linearUserId}</code>
                  </td>
                  <td>{formatTimestamp(account.workspace.setupCompletedAt)}</td>
                  <td>{formatTimestamp(account.updatedAt)}</td>
                  <td>
                    <code className="settings-inline-code" title={account.filePath}>
                      {account.filePath}
                    </code>
                  </td>
                  <td className="settings-user-accounts-actions">
                    <button
                      type="button"
                      className="settings-user-accounts-delete"
                      aria-label={`Delete account file for ${account.linearUserId}`}
                      title="Delete account file"
                      disabled={deletingUserId === account.linearUserId}
                      onClick={() => {
                        void handleDelete(account.linearUserId);
                      }}
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {message ? (
        <p className="settings-hint settings-hint-spaced" role="status">{message}</p>
      ) : null}
      {error ? <p className="error-text settings-hint-spaced">{error}</p> : null}
    </section>
  );
}
