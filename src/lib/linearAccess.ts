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
