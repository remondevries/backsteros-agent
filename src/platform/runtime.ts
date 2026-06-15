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

export function isTauriRemoteShell(): boolean {
  return isTauriRuntime() && Boolean(import.meta.env.VITE_BACKSTER_SERVER_URL?.trim());
}
