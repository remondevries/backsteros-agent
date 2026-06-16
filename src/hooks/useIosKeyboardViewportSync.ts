import { useEffect } from "react";
import { isIosDevice } from "../platform/iosStandalone";

const KEYBOARD_VISIBLE_THRESHOLD_PX = 8;

function getKeyboardLayoutOffsetPx(): number {
  const viewport = window.visualViewport;
  if (!viewport) return 0;
  const layoutHeight = window.innerHeight;
  const visibleBottom = viewport.offsetTop + viewport.height;
  return Math.max(0, Math.round(layoutHeight - visibleBottom));
}

function applyKeyboardViewportOffset() {
  const offset = getKeyboardLayoutOffsetPx();
  const root = document.documentElement;
  root.style.setProperty("--ios-keyboard-layout-offset", `${offset}px`);
  if (offset > KEYBOARD_VISIBLE_THRESHOLD_PX) {
    root.classList.add("ios-keyboard-visible");
  } else {
    root.classList.remove("ios-keyboard-visible");
  }
}

/** Keeps fixed bottom UI pinned to the layout viewport bottom when the software keyboard opens. */
export function useIosKeyboardViewportSync() {
  useEffect(() => {
    if (!isIosDevice()) return;

    applyKeyboardViewportOffset();

    const schedule = () => {
      requestAnimationFrame(applyKeyboardViewportOffset);
    };

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    document.addEventListener("focusin", schedule);
    document.addEventListener("focusout", schedule);

    return () => {
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("focusin", schedule);
      document.removeEventListener("focusout", schedule);
      document.documentElement.style.removeProperty("--ios-keyboard-layout-offset");
      document.documentElement.classList.remove("ios-keyboard-visible");
    };
  }, []);
}
