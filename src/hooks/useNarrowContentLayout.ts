import { useEffect, useState } from "react";
import { isIosDevice } from "../platform/iosStandalone";

export const NARROW_CONTENT_LAYOUT_QUERY = "(max-width: 720px)";

/** True on phone-sized layouts where the content sidebar is a full-screen overlay. */
export function useNarrowContentLayout(): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(NARROW_CONTENT_LAYOUT_QUERY).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(NARROW_CONTENT_LAYOUT_QUERY);
    const handleChange = () => setMatches(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return matches;
}

/** Phone layouts and iOS always pick from the list before showing detail content. */
export function useListFirstNavigationLayout(): boolean {
  const narrowContentLayout = useNarrowContentLayout();
  return narrowContentLayout || isIosDevice();
}
