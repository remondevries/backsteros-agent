import { useEffect } from "react";
import { useCommandPalette } from "../command-palette/CommandPaletteContext";

export function useCommandPaletteShortcut({ enabled }: { enabled: boolean }) {
  const { toggle } = useCommandPalette();

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      if (event.key.toLowerCase() !== "k") return;

      event.preventDefault();
      event.stopPropagation();
      toggle();
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled, toggle]);
}
