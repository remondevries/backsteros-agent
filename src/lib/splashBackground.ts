/** Matches inline styles in index.html and native window background in Tauri. */
export const SPLASH_BACKGROUND = {
  dark: "#070707",
  light: "#f3f3f4",
} as const;

export type SplashTheme = keyof typeof SPLASH_BACKGROUND;

export function splashBackgroundForTheme(theme: SplashTheme | null | undefined): string {
  return theme === "light" ? SPLASH_BACKGROUND.light : SPLASH_BACKGROUND.dark;
}

export function splashThemeFromPrefersColorScheme(): SplashTheme {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "dark";
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
