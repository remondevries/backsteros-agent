import { useEffect } from "react";
import { LEADER_SEQUENCE_HOTKEY_OPTIONS } from "./hotkeyOptions";

let lastLeaderKeyPressAt = 0;

export function registerLeaderKeyPress(): void {
  lastLeaderKeyPressAt = Date.now();
}

export function isLeaderSequencePending(): boolean {
  if (lastLeaderKeyPressAt === 0) return false;
  return Date.now() - lastLeaderKeyPressAt < LEADER_SEQUENCE_HOTKEY_OPTIONS.sequenceTimeoutMs;
}

export function useLeaderKeyRegistration(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "g") return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      registerLeaderKeyPress();
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled]);
}
