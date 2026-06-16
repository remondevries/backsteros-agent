import { useEffect, useRef } from "react";
import type { ProjectDocumentsTabCreateAction } from "../app/contentPanelNavigation";
import { useContentPanelChrome } from "../app/contentPanelChromeContext";

/** Registers the desktop project/team tab-bar create button. */
export function useProjectDocumentsTabCreateAction(
  action: ProjectDocumentsTabCreateAction | null,
) {
  const { setProjectDocumentsCreateAction } = useContentPanelChrome();
  const onCreateRef = useRef(action?.onCreate);
  onCreateRef.current = action?.onCreate;

  const visible = action !== null;
  const disabled = action?.disabled ?? false;
  const label = action?.label ?? "Create";

  useEffect(() => {
    if (!visible) {
      setProjectDocumentsCreateAction(null);
      return;
    }

    setProjectDocumentsCreateAction({
      disabled,
      label,
      onCreate: () => onCreateRef.current?.(),
    });

    return () => setProjectDocumentsCreateAction(null);
  }, [disabled, label, setProjectDocumentsCreateAction, visible]);
}
