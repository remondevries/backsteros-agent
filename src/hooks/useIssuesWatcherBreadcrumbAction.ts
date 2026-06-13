import { useEffect, useRef } from "react";
import { useContentPanelNavigation } from "../app/contentPanelNavigation";

export function useIssuesWatcherBreadcrumbAction(
  action:
    | {
        watcherActive: boolean;
        autoAssignActive: boolean;
        pollIntervalMs: number;
        animationKey: number;
        settingsActive: boolean;
        onToggle: () => void;
      }
    | null,
) {
  const { setIssuesWatcherAction } = useContentPanelNavigation();
  const onToggleRef = useRef(action?.onToggle);
  onToggleRef.current = action?.onToggle;

  const visible = action !== null;
  const watcherActive = action?.watcherActive ?? false;
  const autoAssignActive = action?.autoAssignActive ?? false;
  const pollIntervalMs = action?.pollIntervalMs ?? 0;
  const animationKey = action?.animationKey ?? 0;
  const settingsActive = action?.settingsActive ?? false;

  useEffect(() => {
    if (!visible) {
      setIssuesWatcherAction(null);
      return;
    }

    setIssuesWatcherAction({
      watcherActive,
      autoAssignActive,
      pollIntervalMs,
      animationKey,
      settingsActive,
      onToggle: () => onToggleRef.current?.(),
    });

    return () => setIssuesWatcherAction(null);
  }, [
    visible,
    watcherActive,
    autoAssignActive,
    pollIntervalMs,
    animationKey,
    settingsActive,
    setIssuesWatcherAction,
  ]);
}
