import { useEffect } from "react";
import {
  triggerLinearIssuePropertyShortcut,
  type LinearIssuePropertyShortcutKey,
} from "../lib/linearIssuePropertyShortcuts";

export const LINEAR_ISSUE_PROPERTY_SHORTCUTS = [
  { key: "s", label: "Status" },
  { key: "p", label: "Priority" },
  { key: "a", label: "Assignee" },
  { key: "e", label: "Estimate" },
  { key: "l", label: "Labels" },
] as const satisfies ReadonlyArray<{ key: LinearIssuePropertyShortcutKey; label: string }>;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

export function LinearIssuePropertyShortcuts({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (isEditableTarget(event.target)) return;

      const key = event.key.toLowerCase();
      if (key !== "s" && key !== "p" && key !== "a" && key !== "e" && key !== "l") return;
      if (!triggerLinearIssuePropertyShortcut(key)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled]);

  return null;
}
