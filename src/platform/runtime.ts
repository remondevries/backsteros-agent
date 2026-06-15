export function isTauriRuntime(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  };
  return Boolean(w.__TAURI__ ?? w.__TAURI_INTERNALS__);
}

/** Browser or deployed web app (not the Tauri desktop shell). */
export function isWebRuntime(): boolean {
  return !isTauriRuntime();
}

let tauriRemoteShell = false;

/** Set during bootstrap when the desktop shell targets a hosted sidecar URL. */
export function setTauriRemoteShell(remote: boolean): void {
  tauriRemoteShell = remote;
}

export function isRemoteSidecarBaseUrl(baseUrl: string): boolean {
  const trimmed = baseUrl.trim();
  if (!trimmed || trimmed === "/api") return false;
  try {
    const hostname = new URL(trimmed).hostname;
    return hostname !== "127.0.0.1" && hostname !== "localhost";
  } catch {
    return false;
  }
}

export function isTauriRemoteShell(): boolean {
  return isTauriRuntime() && tauriRemoteShell;
}
