import { useEffect, useState } from "react";
import { isIosDevice } from "../platform/iosStandalone";

export const IOS_MOBILE_LANDSCAPE_QUERY = "(orientation: landscape)";

/** On iPhone/iPad in landscape, notes and issues are read-only so content can use full width. */
export function useIosMobileLandscapeReadOnly(): boolean {
  const [landscape, setLandscape] = useState(() => {
    if (typeof window === "undefined" || !isIosDevice()) return false;
    return window.matchMedia(IOS_MOBILE_LANDSCAPE_QUERY).matches;
  });

  useEffect(() => {
    if (!isIosDevice()) return;
    const mediaQuery = window.matchMedia(IOS_MOBILE_LANDSCAPE_QUERY);
    const handleChange = () => setLandscape(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!landscape || typeof document === "undefined") return;
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }
  }, [landscape]);

  return landscape;
}
