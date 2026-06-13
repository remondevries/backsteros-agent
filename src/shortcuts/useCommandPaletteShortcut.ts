import { useHotkeys } from "react-hotkeys-hook";
import { useCommandPalette } from "../command-palette/CommandPaletteContext";

export function useCommandPaletteShortcut({ enabled }: { enabled: boolean }) {
  const { toggle } = useCommandPalette();

  useHotkeys(
    "mod+k",
    (event) => {
      event.preventDefault();
      toggle();
    },
    {
      enabled,
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [toggle, enabled],
  );
}
