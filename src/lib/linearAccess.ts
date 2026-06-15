import type { HealthResponse } from "./api";
import {
  isLinearSessionExpiredError,
  LINEAR_SESSION_EXPIRED_MESSAGE,
  notifyLinearSessionExpired,
} from "./linearSessionExpired";

export { isLinearSessionExpiredError, LINEAR_SESSION_EXPIRED_MESSAGE } from "./linearSessionExpired";

/** Linear OAuth session is active (browser sign-in completed). */
export function isLinearOAuthAccessGranted(
  health: Pick<HealthResponse, "hasLinearOAuthAuth">,
): boolean {
  return Boolean(health.hasLinearOAuthAuth);
}

/** User can use Linear features when OAuth sign-in is complete. */
export function isLinearAccessGranted(
  health: Pick<HealthResponse, "hasLinearOAuthAuth">,
): boolean {
  return isLinearOAuthAccessGranted(health);
}

export function formatLinearAccessError(message: string): string {
  if (!isLinearSessionExpiredError(message)) {
    return message;
  }
  notifyLinearSessionExpired(message);
  return LINEAR_SESSION_EXPIRED_MESSAGE;
}
