import { useEffect } from "react";
import {
  isSidebarNoteDeletionConfirmOpen,
  isSidebarNoteDeletionShortcutBlocked,
  triggerSidebarNoteDeletionRequest,
} from "../lib/sidebarNoteDeletion";

export function SidebarNoteDeletionShortcuts({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "d") return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (isSidebarNoteDeletionConfirmOpen()) return;
      if (isSidebarNoteDeletionShortcutBlocked(event.target)) return;
      if (!triggerSidebarNoteDeletionRequest()) return;

      event.preventDefault();
      event.stopImmediatePropagation();
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled]);

  return null;
}
