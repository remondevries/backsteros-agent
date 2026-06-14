import { useEffect } from "react";
import { splashBackgroundForTheme } from "../lib/splashBackground";

export function useSystemTheme() {
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    void import("@tauri-apps/api/window")
      .then(async ({ getCurrentWindow }) => {
        const window = getCurrentWindow();
        await window.setTheme(null);
        const theme = await window.theme();
        await window.setBackgroundColor(splashBackgroundForTheme(theme));
        unlisten = await window.onThemeChanged(({ payload: nextTheme }) => {
          void window.setBackgroundColor(splashBackgroundForTheme(nextTheme));
        });
      })
      .catch(() => {
        // Browser dev mode follows prefers-color-scheme via CSS only.
      });

    return () => {
      unlisten?.();
    };
  }, []);
}
