import { useHotkeys } from "react-hotkeys-hook";
import { scrollContentMain } from "../lib/contentMainScroll";
import { APP_HOTKEY_OPTIONS } from "./hotkeyOptions";
import { CONTENT_MAIN_SCROLL_SHORTCUTS } from "./contentMainScrollShortcutBindings";

function ContentMainScrollShortcut({
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

export function ContentMainScrollShortcuts({ enabled }: { enabled: boolean }) {
  return (
    <>
      {CONTENT_MAIN_SCROLL_SHORTCUTS.map((binding) => (
        <ContentMainScrollShortcut
          key={binding.keys}
          keys={binding.keys}
          enabled={enabled}
          onTrigger={() => scrollContentMain(binding.direction)}
        />
      ))}
    </>
  );
}
