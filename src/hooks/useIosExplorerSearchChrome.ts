import { useCallback, useEffect } from "react";
import { useContentPanelChrome } from "../app/contentPanelChromeContext";
import { useCommandPalette } from "../command-palette/CommandPaletteContext";
import { isIosDevice } from "../platform/iosStandalone";

export function useIosExplorerSearchChrome({
  enabled,
  label,
}: {
  enabled: boolean;
  label: string;
}) {
  const { iosMobileSearchAction, setIosMobileSearchAction } = useContentPanelChrome();
  const { setOpen: setCommandPaletteOpen } = useCommandPalette();
  const iosActive = isIosDevice() && enabled;

  const registerSearchAction = useCallback(() => {
    setIosMobileSearchAction({
      label,
      onActivate: () => {
        setCommandPaletteOpen(true);
      },
    });
  }, [label, setCommandPaletteOpen, setIosMobileSearchAction]);

  useEffect(() => {
    if (!iosActive) {
      setIosMobileSearchAction(null);
      return;
    }

    registerSearchAction();
    return () => setIosMobileSearchAction(null);
  }, [iosActive, registerSearchAction, setIosMobileSearchAction]);

  // Re-register when another part of the app cleared chrome without unmounting this explorer.
  useEffect(() => {
    if (!iosActive || iosMobileSearchAction !== null) return;
    registerSearchAction();
  }, [iosActive, iosMobileSearchAction, registerSearchAction]);

  return {
    searchVisibleClassName: undefined,
  };
}
