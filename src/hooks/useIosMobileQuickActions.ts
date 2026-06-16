import { useCallback, useEffect, useRef } from "react";
import { type IosMobileQuickAction, useContentPanelChrome } from "../app/contentPanelChromeContext";
import { isIosDevice } from "../platform/iosStandalone";

function actionsSnapshotKey(actions: IosMobileQuickAction[] | null): string {
  if (!actions?.length) return "";
  return actions.map((action) => `${action.id}:${action.label}:${action.disabled ?? false}`).join("|");
}

export function useIosMobileQuickActions(actions: IosMobileQuickAction[] | null) {
  const { iosMobileQuickActions, setIosMobileQuickActions } = useContentPanelChrome();
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const snapshotKey = actionsSnapshotKey(actions);
  const enabled = isIosDevice() && actions !== null && actions.length > 0;

  const registerQuickActions = useCallback(() => {
    const current = actionsRef.current ?? [];
    setIosMobileQuickActions(
      current.map((action) => ({
        id: action.id,
        label: action.label,
        disabled: action.disabled,
        onClick: () => {
          const live = actionsRef.current?.find((entry) => entry.id === action.id);
          live?.onClick();
        },
      })),
    );
  }, [setIosMobileQuickActions]);

  useEffect(() => {
    if (!enabled) {
      setIosMobileQuickActions(null);
      return;
    }

    registerQuickActions();
    return () => setIosMobileQuickActions(null);
  }, [enabled, registerQuickActions, setIosMobileQuickActions, snapshotKey]);

  useEffect(() => {
    if (!enabled || iosMobileQuickActions !== null) return;
    registerQuickActions();
  }, [enabled, iosMobileQuickActions, registerQuickActions]);
}
