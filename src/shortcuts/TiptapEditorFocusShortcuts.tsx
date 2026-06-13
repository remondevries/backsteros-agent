import { useEffect } from "react";
import { focusPageTiptapEditor } from "../lib/tiptapEditorFocus";

function isModKey(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey;
}

export function TiptapEditorFocusShortcuts({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (!isModKey(event) || event.altKey || event.shiftKey) return;
      if (event.key.toLowerCase() !== "e") return;

      if (!focusPageTiptapEditor()) return;
      event.preventDefault();
      event.stopPropagation();
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled]);

  return null;
}
