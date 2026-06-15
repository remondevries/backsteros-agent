import { getHealth, loginWithAccessToken, setSidecarConnection } from "./api";
import { loadTauriSidecarConnection } from "../platform/sidecar";

/** Single health request on app load — fail fast if the agent server is down. */
export const BOOTSTRAP_HEALTH_TIMEOUT_MS = 3_000;
export const BOOTSTRAP_CHECKING_MESSAGE = "Checking connection…";

export async function configureSidecarConnection(): Promise<void> {
  const tauriConnection = await loadTauriSidecarConnection();
  if (tauriConnection) {
    setSidecarConnection({
      baseUrl: tauriConnection.baseUrl,
      token: tauriConnection.token,
    });
    return;
  }

  if (import.meta.env.DEV) {
    setSidecarConnection({
      baseUrl: "/api",
      token: import.meta.env.VITE_SIDECAR_TOKEN ?? "dev-token-change-me",
    });
    return;
  }

  const devToken = import.meta.env.VITE_SIDECAR_TOKEN?.trim();
  if (devToken) {
    try {
      await loginWithAccessToken(devToken);
      return;
    } catch {
      // Fall through to cookie session or settings prompt.
    }
  }

  setSidecarConnection({
    baseUrl: "",
    token: "",
  });
}

export async function fetchBootstrapHealth() {
  return getHealth({ force: true, timeoutMs: BOOTSTRAP_HEALTH_TIMEOUT_MS });
}
