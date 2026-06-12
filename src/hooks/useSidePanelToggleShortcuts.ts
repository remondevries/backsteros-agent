import { useEffect } from "react";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

export function useSidePanelToggleShortcuts({
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
  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;

      if (event.key === "[") {
        event.preventDefault();
        event.stopPropagation();
        onToggleLeftSidePanel();
        return;
      }

      if (event.key === "]") {
        event.preventDefault();
        event.stopPropagation();
        onToggleRightSidePanel();
        return;
      }

      if (event.key === "\\") {
        event.preventDefault();
        event.stopPropagation();
        onToggleContentPanelSidebar();
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [
    enabled,
    onToggleContentPanelSidebar,
    onToggleLeftSidePanel,
    onToggleRightSidePanel,
  ]);
}
