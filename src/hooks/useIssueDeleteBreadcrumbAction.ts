import { useEffect, useRef } from "react";
import { useContentPanelChrome } from "../app/contentPanelChromeContext";

export function useIssueDeleteBreadcrumbAction(
  action: { deleting: boolean; onDelete: () => void } | null,
) {
  const { setIssueDeleteAction } = useContentPanelChrome();
  const onDeleteRef = useRef(action?.onDelete);
  onDeleteRef.current = action?.onDelete;

  const visible = action !== null;
  const deleting = action?.deleting ?? false;

  useEffect(() => {
    if (!visible) {
      setIssueDeleteAction(null);
      return;
    }

    setIssueDeleteAction({
      deleting,
      onDelete: () => onDeleteRef.current?.(),
    });

    return () => setIssueDeleteAction(null);
  }, [deleting, setIssueDeleteAction, visible]);
}
