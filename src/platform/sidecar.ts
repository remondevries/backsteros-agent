import { isTauriRuntime } from "./runtime";

const TAURI_INVOKE_RETRIES = 1;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loadTauriSidecarConnection(): Promise<{ baseUrl: string; token: string } | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  for (let attempt = 0; attempt < TAURI_INVOKE_RETRIES; attempt += 1) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const connection = await invoke<{ baseUrl: string; token: string }>("get_sidecar_connection");
      if (!connection.baseUrl) {
        return null;
      }
      return connection;
    } catch {
      if (attempt < TAURI_INVOKE_RETRIES - 1) {
        await sleep(100);
      }
    }
  }

  return null;
}

export async function restartEmbeddedSidecar(): Promise<void> {
  if (!isTauriRuntime() || import.meta.env.DEV) {
    return;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("restart_sidecar");
  } catch {
    // Hot reload may already have applied secrets in the running sidecar.
  }
}
