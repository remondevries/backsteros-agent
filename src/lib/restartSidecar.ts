import { waitForSidecar } from "./api";
import { restartEmbeddedSidecar } from "../platform/sidecar";
import { isTauriRuntime } from "./tauriRuntime";

export async function restartSidecarIfNeeded(): Promise<void> {
  if (import.meta.env.DEV || !isTauriRuntime()) {
    return;
  }

  await restartEmbeddedSidecar();
  await waitForSidecar({
    retries: 12,
    delayMs: 200,
    healthTimeoutMs: 2_000,
  });
}
