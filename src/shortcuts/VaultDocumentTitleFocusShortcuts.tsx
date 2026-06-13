import { useEffect } from "react";
import { focusVaultDocumentTitle } from "../lib/vaultDocumentTitleFocus";

export const VAULT_DOCUMENT_TITLE_FOCUS_SHORTCUT = {
  keys: "mod+r",
  hint: "⌘R",
} as const;

function isModKey(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey;
}

export function VaultDocumentTitleFocusShortcuts({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (!isModKey(event) || event.altKey || event.shiftKey) return;
      if (event.key.toLowerCase() !== "r") return;
      if (!focusVaultDocumentTitle()) return;

      event.preventDefault();
      event.stopImmediatePropagation();
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled]);

  return null;
}
