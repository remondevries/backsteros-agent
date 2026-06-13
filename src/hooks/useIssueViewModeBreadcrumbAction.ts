import { useEffect, useRef } from "react";
import { useContentPanelChrome } from "../app/contentPanelChromeContext";
import type { LinearIssueViewMode } from "../app/project-issues/LinearIssueViewModeToggle";

export function useIssueViewModeBreadcrumbAction(
  action:
    | {
        mode: LinearIssueViewMode;
        onChange: (mode: LinearIssueViewMode) => void;
        terminalSessionActive: boolean;
        terminalAgentWorking: boolean;
        terminalAgentWaiting: boolean;
      }
    | null,
) {
  const { setIssueViewModeAction } = useContentPanelChrome();
  const onChangeRef = useRef(action?.onChange);
  onChangeRef.current = action?.onChange;

  const visible = action !== null;
  const mode = action?.mode ?? "issue";
  const terminalSessionActive = action?.terminalSessionActive ?? false;
  const terminalAgentWorking = action?.terminalAgentWorking ?? false;
  const terminalAgentWaiting = action?.terminalAgentWaiting ?? false;

  useEffect(() => {
    if (!visible) {
      setIssueViewModeAction(null);
      return;
    }

    setIssueViewModeAction({
      mode,
      onChange: (next) => onChangeRef.current?.(next),
      terminalSessionActive,
      terminalAgentWorking,
      terminalAgentWaiting,
    });

    return () => setIssueViewModeAction(null);
  }, [
    visible,
    mode,
    terminalSessionActive,
    terminalAgentWorking,
    terminalAgentWaiting,
    setIssueViewModeAction,
  ]);
}
