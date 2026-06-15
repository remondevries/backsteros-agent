import { isDevIosSimulation, isIosDevice, isIosStandaloneWebApp } from "./iosStandalone";
import { isTauriRuntime } from "./runtime";

/** Sets `html` classes used by layout CSS (Tauri chrome, iOS safe areas). */
export function initDocumentLayoutClasses(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (isTauriRuntime()) {
    root.classList.add("tauri");
  }
  if (isIosDevice()) {
    root.classList.add("ios-device");
  }
  if (isIosDevice() && isIosStandaloneWebApp()) {
    root.classList.add("ios-standalone");
    if (isDevIosSimulation()) {
      root.classList.add("ios-standalone-dev");
    }
  }
}
