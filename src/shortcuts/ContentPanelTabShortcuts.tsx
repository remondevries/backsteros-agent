import { useEffect } from "react";
import { useCommandPalette } from "../command-palette/CommandPaletteContext";

function isModKey(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

export function ContentPanelTabShortcuts({
  enabled,
  onNewTab,
  onPreviousTab,
  onNextTab,
}: {
  enabled: boolean;
  onNewTab: () => void;
  onPreviousTab: () => void;
  onNextTab: () => void;
}) {
  const { open: commandPaletteOpen } = useCommandPalette();
  const shortcutsEnabled = enabled && !commandPaletteOpen;

  useEffect(() => {
    if (!shortcutsEnabled) return undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (!isModKey(event) || event.altKey) return;

      const key = event.key.toLowerCase();

      if (key === "t") {
        event.preventDefault();
        onNewTab();
        return;
      }

      if (isEditableTarget(event.target)) return;

      if (key === "[") {
        event.preventDefault();
        onPreviousTab();
        return;
      }

      if (key === "]") {
        event.preventDefault();
        onNextTab();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onNewTab, onNextTab, onPreviousTab, shortcutsEnabled]);

  return null;
}
