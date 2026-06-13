import { useCallback, useEffect } from "react";
import { useCommandPalette } from "../command-palette/CommandPaletteContext";
import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import { performContentPanelBack } from "../lib/contentPanelBack";
import { getContentListNavigationController } from "../lib/contentListNavigation";
import { shouldRestoreTiptapEditorFocus, restoreTiptapEditorFocus } from "../lib/tiptapEditorFocus";
import { useContentPanelNavigation } from "../app/contentPanelNavigation";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

export function ContentPanelBackShortcuts({
  enabled,
  settingsOpen,
  activeVaultNavItem,
}: {
  enabled: boolean;
  settingsOpen: boolean;
  activeVaultNavItem: SidebarNavItemId | null;
}) {
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();
  const {
    activeLinearIssue,
    activeLinearDocument,
    activeVaultDocument,
    linearSelection,
    linearWorkspaceView,
    clearActiveLinearIssue,
    clearActiveLinearDocument,
    clearActiveVaultDocument,
    setLinearWorkspaceView,
    setLinearSelection,
  } = useContentPanelNavigation();

  const handleBack = useCallback(() => {
    return performContentPanelBack(
      {
        commandPaletteOpen,
        activeLinearIssue,
        activeLinearDocument,
        activeVaultDocument,
        activeVaultNavItem,
        linearSelection,
        linearWorkspaceView,
      },
      {
        closeCommandPalette: () => setCommandPaletteOpen(false),
        clearActiveLinearIssue,
        clearActiveLinearDocument,
        clearActiveVaultDocument,
        setLinearWorkspaceView,
        setLinearSelection,
        clearKeyboardListFocus: () => {
          const controller = getContentListNavigationController();
          if (!controller?.getFocusedId()) return false;
          controller.clearFocus();
          return true;
        },
      },
    );
  }, [
    activeLinearDocument,
    activeLinearIssue,
    activeVaultDocument,
    clearActiveLinearDocument,
    clearActiveLinearIssue,
    clearActiveVaultDocument,
    commandPaletteOpen,
    activeVaultNavItem,
    linearSelection,
    linearWorkspaceView,
    setCommandPaletteOpen,
    setLinearSelection,
    setLinearWorkspaceView,
  ]);

  useEffect(() => {
    if (!enabled || settingsOpen) return undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.metaKey || event.ctrlKey || event.altKey) return;

      if (shouldRestoreTiptapEditorFocus() && restoreTiptapEditorFocus()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      if (isEditableTarget(event.target)) return;

      if (!handleBack()) return;

      event.preventDefault();
      event.stopImmediatePropagation();
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled, handleBack, settingsOpen]);

  return null;
}
