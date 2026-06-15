const IOS_SIMULATE_QUERY = "ios";

/** Dev-only: `?ios=1` on localhost makes the app behave like an iPhone Home Screen web app. */
export function isDevIosSimulation(): boolean {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  const value = new URLSearchParams(window.location.search).get(IOS_SIMULATE_QUERY)?.trim();
  return value === "1" || value === "true" || value === "standalone";
}

/** iPhone / iPad (including iPadOS reporting as MacIntel). */
export function isIosDevice(): boolean {
  if (isDevIosSimulation()) return true;
  if (typeof navigator === "undefined") return false;
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Home Screen web app on iOS (no Safari chrome). */
export function isIosStandaloneWebApp(): boolean {
  if (isDevIosSimulation()) return true;
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

