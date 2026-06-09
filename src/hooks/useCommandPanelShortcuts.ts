import { useEffect, useRef } from "react";
import { findAppViewByLetter, type AppView } from "../app/appViews";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

export function useCommandPanelShortcuts({
  enabled,
  commandPanelOpen,
  onOpen,
  onNavigate,
}: {
  enabled: boolean;
  commandPanelOpen: boolean;
  onOpen: () => void;
  onNavigate: (view: AppView) => void;
}) {
  const pendingGoRef = useRef(false);
  const pendingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    function clearPendingGo() {
      pendingGoRef.current = false;
      if (pendingTimerRef.current != null) {
        window.clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) {
        clearPendingGo();
        return;
      }

      const key = event.key.toLowerCase();

      if (commandPanelOpen) {
        return;
      }

      if (pendingGoRef.current) {
        const matchedView = findAppViewByLetter(key);
        clearPendingGo();
        if (matchedView) {
          event.preventDefault();
          event.stopPropagation();
          onNavigate(matchedView.id);
        }
        return;
      }

      if (key !== "g") return;

      event.preventDefault();
      event.stopPropagation();
      pendingGoRef.current = true;
      onOpen();
      pendingTimerRef.current = window.setTimeout(() => {
        clearPendingGo();
      }, 1200);
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      clearPendingGo();
    };
  }, [commandPanelOpen, enabled, onNavigate, onOpen]);
}
