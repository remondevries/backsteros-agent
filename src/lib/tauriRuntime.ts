export function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean((window as Window & { __TAURI__?: unknown }).__TAURI__)
  );
}
