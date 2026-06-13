import { useCallback, useEffect } from "react";
import { requestRightPanelComposerFocus } from "../lib/rightPanelChatFocus";

export const RIGHT_PANEL_CHAT_FOCUS_SHORTCUT = {
  keys: "mod+j",
  hint: "⌘J",
} as const;

function isModKey(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey;
}

export function RightPanelChatFocusShortcuts({
  enabled,
  rightSidePanelOpen,
  onOpenRightSidePanel,
}: {
  enabled: boolean;
  rightSidePanelOpen: boolean;
  onOpenRightSidePanel: () => void;
}) {
  const handleFocusChat = useCallback(() => {
    if (!rightSidePanelOpen) {
      onOpenRightSidePanel();
    }
    requestRightPanelComposerFocus();
  }, [onOpenRightSidePanel, rightSidePanelOpen]);

  useEffect(() => {
    if (!enabled) return undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (!isModKey(event) || event.altKey || event.shiftKey) return;
      if (event.key.toLowerCase() !== "j") return;

      event.preventDefault();
      event.stopImmediatePropagation();
      handleFocusChat();
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled, handleFocusChat]);

  return null;
}
