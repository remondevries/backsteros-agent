import { waitForSidecar } from "./api";
import { isTauriRuntime } from "./tauriRuntime";

export async function restartSidecarIfNeeded(): Promise<void> {
  if (import.meta.env.DEV || !isTauriRuntime()) {
    return;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("restart_sidecar");
    await waitForSidecar({
      retries: 12,
      delayMs: 200,
      healthTimeoutMs: 2_000,
    });
  } catch {
    // Hot reload already applied secrets in the running sidecar.
  }
}
