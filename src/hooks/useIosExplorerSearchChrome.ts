import { useEffect, useRef, useState, type RefObject } from "react";
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
  const { setIosMobileSearchAction } = useContentPanelChrome();
  const [searchVisible, setSearchVisible] = useState(false);
  const inputRefStable = useRef(inputRef);
  inputRefStable.current = inputRef;
  const iosActive = isIosDevice() && enabled;

  useEffect(() => {
    if (!iosActive) {
      setSearchVisible(false);
      setIosMobileSearchAction(null);
      return;
    }

    setIosMobileSearchAction({
      label,
      onActivate: () => {
        setSearchVisible(true);
        requestAnimationFrame(() => {
          inputRefStable.current.current?.focus({ preventScroll: true });
        });
      },
    });

    return () => setIosMobileSearchAction(null);
  }, [iosActive, label, setIosMobileSearchAction]);

  return {
    searchVisibleClassName: searchVisible ? "ios-explorer-search-visible" : undefined,
  };
}
