import { useEffect, useState } from "react";
import {
  isIosKeyboardOffsetVisible,
  readIosKeyboardLayoutOffsetPx,
} from "../lib/iosKeyboardViewport";
import { isIosDevice } from "../platform/iosStandalone";

let keyboardVisible = false;
const keyboardVisibilityListeners = new Set<() => void>();

function notifyKeyboardVisibility(visible: boolean) {
  if (keyboardVisible === visible) return;
  keyboardVisible = visible;
  for (const listener of keyboardVisibilityListeners) {
    listener();
  }
}

function applyKeyboardViewportOffset() {
  const offset = readIosKeyboardLayoutOffsetPx();
  const visible = isIosKeyboardOffsetVisible(offset);
  const root = document.documentElement;
  root.style.setProperty("--ios-keyboard-layout-offset", `${offset}px`);
  if (visible) {
    root.classList.add("ios-keyboard-visible");
  } else {
    root.classList.remove("ios-keyboard-visible");
  }
  notifyKeyboardVisibility(visible);
}

/** Whether the software keyboard is covering the bottom of the layout viewport. */
export function useIosKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(keyboardVisible);

  useEffect(() => {
    if (!isIosDevice()) return;

    const sync = () => setVisible(keyboardVisible);
    keyboardVisibilityListeners.add(sync);
    sync();

    return () => {
      keyboardVisibilityListeners.delete(sync);
    };
  }, []);

  return visible;
}

/** Tracks keyboard visibility for iOS mobile chrome (content inset + bottom nav hide). */
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
      notifyKeyboardVisibility(false);
    };
  }, []);
}
