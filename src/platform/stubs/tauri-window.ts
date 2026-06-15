/** Web-build stub for @tauri-apps/api/window */

type Theme = "light" | "dark";

export function getCurrentWindow() {
  return {
    close: async () => {
      window.close();
    },
    setTheme: async (_theme: Theme | null) => {},
    theme: async (): Promise<Theme | null> => null,
    setBackgroundColor: async (_color: string) => {},
    onThemeChanged: async (_handler: (event: { payload: Theme }) => void) => () => {},
    onFocusChanged: async (_handler: (event: { payload: boolean }) => void) => () => {},
  };
}
