import { useRef } from "react";
import { useContentPanelNavigation } from "../app/contentPanelNavigation";
import { isContentDetailViewOpen } from "../lib/iosQuickActionVisibility";
import { useIosMobileQuickActions } from "./useIosMobileQuickActions";
import { useProjectDocumentsTabCreateAction } from "./useProjectDocumentsTabCreateAction";

export function useLinearWorkspaceTabCreateAction(
  action: { disabled: boolean; label: string; onCreate: () => void } | null,
  options?: { iosQuickAction?: boolean },
) {
  const navigation = useContentPanelNavigation();
  const onCreateRef = useRef(action?.onCreate);
  onCreateRef.current = action?.onCreate;

  const detailOpen = isContentDetailViewOpen(navigation);
  const visible = action !== null && !detailOpen;
  const iosQuickAction = options?.iosQuickAction !== false;
  const disabled = action?.disabled ?? false;
  const label = action?.label ?? "Create";

  useProjectDocumentsTabCreateAction(
    visible
      ? {
          disabled,
          label,
          onCreate: () => onCreateRef.current?.(),
        }
      : null,
  );

  useIosMobileQuickActions(
    visible && iosQuickAction
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
}
