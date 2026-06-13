import { useHotkeys } from "react-hotkeys-hook";
import { getContentListNavigationController } from "../lib/contentListNavigation";
import { APP_HOTKEY_OPTIONS } from "./hotkeyOptions";
import { CONTENT_LIST_NAVIGATION_SHORTCUTS } from "./contentListNavigationShortcutBindings";

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
