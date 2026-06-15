/** iPhone / iPad (including iPadOS reporting as MacIntel). */
export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Home Screen web app on iOS (no Safari chrome). */
export function isIosStandaloneWebApp(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

/**
 * Marks the document when running as an iOS Home Screen app so layout can use
 * safe-area insets (Dynamic Island, notch, or status bar — no device sniffing).
 */
export function initIosStandaloneLayout(): void {
  if (!isIosDevice() || !isIosStandaloneWebApp()) return;
  document.documentElement.classList.add("ios-standalone");
}
