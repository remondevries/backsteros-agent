import { useEffect } from "react";
import { getLinearProjectViewNavigationRegistration } from "../lib/linearProjectViewNavigation";
import {
  getLinearWorkspaceViewForShortcutDigit,
  LINEAR_PROJECT_VIEW_SHORTCUT_DIGITS,
} from "./linearProjectViewShortcutBindings";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

export function LinearProjectViewShortcuts({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (!LINEAR_PROJECT_VIEW_SHORTCUT_DIGITS.includes(event.key as (typeof LINEAR_PROJECT_VIEW_SHORTCUT_DIGITS)[number])) {
        return;
      }
      if (isEditableTarget(event.target)) return;

      const active = getLinearProjectViewNavigationRegistration();
      if (!active) return;

      const nextView = getLinearWorkspaceViewForShortcutDigit(active.selectionKind, event.key);
      if (!nextView) return;

      event.preventDefault();
      event.stopPropagation();
      active.onSelectView(nextView);
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled]);

  return null;
}
