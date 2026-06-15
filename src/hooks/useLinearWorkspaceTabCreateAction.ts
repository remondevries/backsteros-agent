import { useEffect, useRef } from "react";
import { useContentPanelChrome } from "../app/contentPanelChromeContext";
import { useIosMobileQuickActions } from "./useIosMobileQuickActions";

export function useLinearWorkspaceTabCreateAction(
  action: { disabled: boolean; label: string; onCreate: () => void } | null,
) {
  const { setProjectDocumentsCreateAction } = useContentPanelChrome();
  const onCreateRef = useRef(action?.onCreate);
  onCreateRef.current = action?.onCreate;

  const visible = action !== null;
  const disabled = action?.disabled ?? false;
  const label = action?.label ?? "Create";

  useIosMobileQuickActions(
    visible
      ? [
          {
            id: "linear-workspace-tab-create",
            label,
            disabled,
            onClick: () => onCreateRef.current?.(),
          },
        ]
      : null,
  );

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
