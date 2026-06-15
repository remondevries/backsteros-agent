export const LINEAR_SESSION_EXPIRED_MESSAGE =
  "Linear session expired. Sign in again on the connect screen or in Settings → Connections.";

export function isLinearSessionExpiredError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("authentication required") ||
    lower.includes("not authenticated") ||
    lower.includes("linear session expired")
  );
}

type LinearSessionExpiredListener = () => void;

const listeners = new Set<LinearSessionExpiredListener>();
let lastNotifiedAt = 0;

export function subscribeLinearSessionExpired(
  listener: LinearSessionExpiredListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyLinearSessionExpired(message: string): void {
  if (!isLinearSessionExpiredError(message)) {
    return;
  }

  const now = Date.now();
  if (now - lastNotifiedAt < 1_000) {
    return;
  }
  lastNotifiedAt = now;

  for (const listener of listeners) {
    listener();
  }
}

/** @internal Test helper */
export function resetLinearSessionExpiredNotifyState(): void {
  lastNotifiedAt = 0;
  listeners.clear();
}
