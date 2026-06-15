import { useEffect, useRef } from "react";
import type { ProjectsBrowseSearchBreadcrumbAction } from "../app/contentPanelNavigation";
import { useContentPanelChrome } from "../app/contentPanelChromeContext";

export function useProjectsBrowseSearchBreadcrumbAction(
  action: ProjectsBrowseSearchBreadcrumbAction | null,
) {
  const { setProjectsBrowseSearchAction } = useContentPanelChrome();
  const onChangeRef = useRef(action?.onChange);
  onChangeRef.current = action?.onChange;

  const visible = action !== null;
  const value = action?.value ?? "";
  const placeholder = action?.placeholder ?? "Search projects…";
  const ariaLabel = action?.ariaLabel ?? "Search projects";
  const disabled = action?.disabled ?? false;

  useEffect(() => {
    if (!visible) {
      setProjectsBrowseSearchAction(null);
      return;
    }

    setProjectsBrowseSearchAction({
      value,
      placeholder,
      ariaLabel,
      disabled,
      onChange: (nextValue) => onChangeRef.current?.(nextValue),
    });

    return () => setProjectsBrowseSearchAction(null);
  }, [
    ariaLabel,
    disabled,
    placeholder,
    setProjectsBrowseSearchAction,
    value,
    visible,
  ]);
}
