import { useEffect } from "react";

export function useSystemTheme() {
  useEffect(() => {
    void import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) => getCurrentWindow().setTheme(null))
      .catch(() => {
        // Browser dev mode follows prefers-color-scheme via CSS only.
      });
  }, []);
}
