import { useEffect } from "react";

type SessionTabShortcutHandlers = {
  onNewTab: () => void;
  onCloseTab: () => void | Promise<void>;
  onRenameTab: () => void;
  onPreviousTab: () => void;
  onNextTab: () => void;
};

function isModKey(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

async function closeAppWindow() {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
  } catch {
    window.close();
  }
}

export function useSessionTabShortcuts(
  enabled: boolean,
  handlers: SessionTabShortcutHandlers,
) {
  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (!isModKey(event)) return;

      const key = event.key.toLowerCase();

      if (key === "t") {
        event.preventDefault();
        handlers.onNewTab();
        return;
      }

      if (key === "w") {
        event.preventDefault();
        void (async () => {
          await handlers.onCloseTab();
        })();
        return;
      }

      if (key === "r") {
        if (
          event.target instanceof HTMLElement &&
          event.target.closest(".letter-filing-panel")
        ) {
          return;
        }
        event.preventDefault();
        handlers.onRenameTab();
        return;
      }

      if (!event.shiftKey) return;
      if (isEditableTarget(event.target)) return;

      if (key === "[" || event.key === "ArrowLeft") {
        event.preventDefault();
        handlers.onPreviousTab();
        return;
      }

      if (key === "]" || event.key === "ArrowRight") {
        event.preventDefault();
        handlers.onNextTab();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, handlers]);
}

export { closeAppWindow };
