import { useEffect } from "react";

function isShortcutBlockedTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        ".session-tab-rename-input, .attachment-modal-backdrop, .command-panel-root",
      ),
    )
  );
}

function isInputModeShortcut(event: KeyboardEvent): boolean {
  return event.metaKey && event.altKey && !event.ctrlKey && !event.shiftKey;
}

export function useInputModeShortcuts({
  isActive,
  supported,
  setEnabled,
  onSwitchToText,
}: {
  isActive: boolean;
  supported: boolean;
  setEnabled: (enabled: boolean) => void;
  onSwitchToText?: () => void;
}) {
  useEffect(() => {
    if (!isActive || !supported) return;

    function onKeyDown(event: KeyboardEvent) {
      if (!isInputModeShortcut(event)) return;
      if (isShortcutBlockedTarget(event.target)) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setEnabled(false);
        onSwitchToText?.();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setEnabled(true);
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [isActive, onSwitchToText, setEnabled, supported]);
}
