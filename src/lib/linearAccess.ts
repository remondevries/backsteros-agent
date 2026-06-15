import type { HealthResponse } from "./api";

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
  const lower = message.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not authenticated") ||
    lower.includes("linear session expired")
  ) {
    return "Linear session expired. Sign in again on the connect screen or in Settings → Connections.";
  }
  return message;
}
