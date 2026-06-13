import { useEffect } from "react";
import { PANEL_TOGGLE_SHORTCUTS } from "./panelToggleShortcutBindings";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

const PANEL_TOGGLE_KEYS: Record<string, (typeof PANEL_TOGGLE_SHORTCUTS)[number]["action"]> = {
  "[": "left",
  "]": "right",
  "\\": "content-sidebar",
};

export function PanelToggleShortcuts({
  enabled,
  onToggleLeftSidePanel,
  onToggleRightSidePanel,
  onToggleContentPanelSidebar,
}: {
  enabled: boolean;
  onToggleLeftSidePanel: () => void;
  onToggleRightSidePanel: () => void;
  onToggleContentPanelSidebar: () => void;
}) {
  const actionHandlers = {
    left: onToggleLeftSidePanel,
    right: onToggleRightSidePanel,
    "content-sidebar": onToggleContentPanelSidebar,
  } as const;

  useEffect(() => {
    if (!enabled) return undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;

      const action = PANEL_TOGGLE_KEYS[event.key];
      if (!action) return;

      event.preventDefault();
      event.stopPropagation();
      actionHandlers[action]();
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [
    enabled,
    onToggleContentPanelSidebar,
    onToggleLeftSidePanel,
    onToggleRightSidePanel,
  ]);

  return null;
}
