import { useEffect } from "react";
import { isSidebarNoteDeletionConfirmOpen } from "../lib/sidebarNoteDeletion";
import {
  isSidebarNoteCreationShortcutBlocked,
  triggerSidebarNoteCreation,
} from "../lib/sidebarNoteCreation";
import { isLeaderSequencePending } from "./leaderSequenceGate";

export function SidebarNoteCreationShortcuts({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return undefined;

    function onKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (key !== "c") return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (isSidebarNoteDeletionConfirmOpen()) return;
      if (isLeaderSequencePending()) return;
      if (isSidebarNoteCreationShortcutBlocked(event.target)) return;
      if (!triggerSidebarNoteCreation()) return;

      event.preventDefault();
      event.stopImmediatePropagation();
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled]);

  return null;
}
