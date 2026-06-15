import { ConnectGateShell } from "./ConnectGateShell";

export function ServiceOfflineShell({
  retrying = false,
  onRetry,
}: {
  retrying?: boolean;
  onRetry?: () => void;
}) {
  return (
    <ConnectGateShell
      className="service-offline-shell"
      title="System offline"
      description="BacksterOS is temporarily unavailable. We'll be back shortly."
    >
      {onRetry ? (
        <div className="linear-connect-gate-actions">
          <button
            type="button"
            className="btn-secondary"
            disabled={retrying}
            onClick={onRetry}
          >
            {retrying ? "Checking…" : "Try again"}
          </button>
        </div>
      ) : null}
    </ConnectGateShell>
  );
}
