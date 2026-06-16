import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useContentPanelChrome } from "../app/contentPanelChromeContext";
import { isIosDevice } from "../platform/iosStandalone";

export function useIosExplorerSearchChrome({
  enabled,
  label,
  inputRef,
}: {
  enabled: boolean;
  label: string;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const { iosMobileSearchAction, setIosMobileSearchAction } = useContentPanelChrome();
  const [searchVisible, setSearchVisible] = useState(false);
  const inputRefStable = useRef(inputRef);
  inputRefStable.current = inputRef;
  const iosActive = isIosDevice() && enabled;

  const registerSearchAction = useCallback(() => {
    setIosMobileSearchAction({
      label,
      onActivate: () => {
        setSearchVisible(true);
        requestAnimationFrame(() => {
          inputRefStable.current.current?.focus({ preventScroll: true });
        });
      },
    });
  }, [label, setIosMobileSearchAction]);

  useEffect(() => {
    if (!iosActive) {
      setSearchVisible(false);
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
    searchVisibleClassName: searchVisible ? "ios-explorer-search-visible" : undefined,
  };
}
