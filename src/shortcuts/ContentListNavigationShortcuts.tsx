import { useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { getContentListNavigationController } from "../lib/contentListNavigation";
import { APP_HOTKEY_OPTIONS } from "./hotkeyOptions";
import { CONTENT_LIST_NAVIGATION_SHORTCUTS } from "./contentListNavigationShortcutBindings";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function ContentListNavigationShortcut({
  keys,
  enabled,
  onTrigger,
}: {
  keys: string;
  enabled: boolean;
  onTrigger: () => boolean;
}) {
  useHotkeys(
    keys,
    (event) => {
      if (!onTrigger()) return;
      event.preventDefault();
    },
    { ...APP_HOTKEY_OPTIONS, enabled },
    [onTrigger, enabled],
  );
  return null;
}

export function ContentListNavigationShortcuts({ enabled }: { enabled: boolean }) {
  const handleAction = (action: (typeof CONTENT_LIST_NAVIGATION_SHORTCUTS)[number]["action"]) => {
    const controller = getContentListNavigationController();
    if (!controller) return false;
    return action === "activate"
      ? controller.activateFocused()
      : controller.moveFocus(action === "move-down" ? "down" : "up");
  };

  useEffect(() => {
    if (!enabled) return undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;

      const controller = getContentListNavigationController();
      if (!controller) return;

      const cycled = controller.cycleList(event.shiftKey ? "prev" : "next");
      if (!cycled) return;

      event.preventDefault();
      event.stopPropagation();
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled]);

  return (
    <>
      {CONTENT_LIST_NAVIGATION_SHORTCUTS.map((binding) => (
        <ContentListNavigationShortcut
          key={binding.keys}
          keys={binding.keys}
          enabled={enabled}
          onTrigger={() => handleAction(binding.action)}
        />
      ))}
    </>
  );
}
