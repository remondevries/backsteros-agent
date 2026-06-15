import { useEffect, useRef } from "react";
import { useContentPanelChrome } from "../app/contentPanelChromeContext";

export function useDocumentDeleteBreadcrumbAction(
  action: { deleting: boolean; onDelete: () => void } | null,
) {
  const { setDocumentDeleteAction } = useContentPanelChrome();
  const onDeleteRef = useRef(action?.onDelete);
  onDeleteRef.current = action?.onDelete;

  const visible = action !== null;
  const deleting = action?.deleting ?? false;

  useEffect(() => {
    if (!visible) {
      setDocumentDeleteAction(null);
      return;
    }

    setDocumentDeleteAction({
      deleting,
      onDelete: () => onDeleteRef.current?.(),
    });

    return () => setDocumentDeleteAction(null);
  }, [deleting, setDocumentDeleteAction, visible]);
}
