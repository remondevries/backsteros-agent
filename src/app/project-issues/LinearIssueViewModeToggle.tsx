import { useEffect, useRef } from "react";
import { DotScrollLoader } from "../../chat/DotScrollLoader";

export type LinearIssueViewMode = "issue" | "terminal";

const VIEW_MODE_OPTIONS: readonly { mode: LinearIssueViewMode; label: string }[] = [
  { mode: "issue", label: "Issue" },
  { mode: "terminal", label: "Terminal" },
] as const;

export function LinearIssueViewModeToggle({
  mode,
  onChange,
  terminalSessionActive = false,
  terminalAgentWorking = false,
  terminalAgentWaiting = false,
  terminalDebugLabel = "",
}: {
  mode: LinearIssueViewMode;
  onChange: (mode: LinearIssueViewMode) => void;
  terminalSessionActive?: boolean;
  terminalAgentWorking?: boolean;
  terminalAgentWaiting?: boolean;
  terminalDebugLabel?: string;
}) {
  const activeIndex = mode === "issue" ? 0 : 1;

  // #region agent log
  const lastLoggedLabelRef = useRef<string | null>(null);
  useEffect(() => {
    const derived = terminalAgentWorking
      ? "working"
      : terminalAgentWaiting
        ? "waiting"
        : terminalSessionActive
          ? "idle"
          : "none";
    const payload = `${derived}|${terminalDebugLabel}`;
    if (lastLoggedLabelRef.current === payload) return;
    lastLoggedLabelRef.current = payload;
    fetch('http://127.0.0.1:7520/ingest/4580ffec-ea73-4c04-a5e5-8313ab77c6f6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'201eaf'},body:JSON.stringify({sessionId:'201eaf',hypothesisId:'B',location:'LinearIssueViewModeToggle.tsx:render',message:'derived terminal UI state changed',data:{derived,terminalSessionActive,terminalAgentWorking,terminalAgentWaiting,terminalDebugLabel},timestamp:Date.now()})}).catch(()=>{});
  }, [terminalSessionActive, terminalAgentWorking, terminalAgentWaiting, terminalDebugLabel]);
  // #endregion

  return (
    <div
      className="model-mode-toggle linear-issue-view-mode-toggle"
      role="group"
      aria-label="Issue content mode"
      data-active-index={activeIndex}
    >
      <span className="model-mode-indicator" aria-hidden="true" />
      {VIEW_MODE_OPTIONS.map((option) => {
        const active = mode === option.mode;
        return (
          <button
            key={option.mode}
            type="button"
            className={`model-mode-option ${active ? "active" : ""}`}
            onClick={() => onChange(option.mode)}
            aria-pressed={active}
          >
            <span className="linear-issue-view-mode-option-label">
              {option.label}
              {option.mode === "terminal" && terminalSessionActive && terminalAgentWorking ? (
                <DotScrollLoader
                  className="linear-issue-terminal-session-loader"
                  aria-label="Agent working in terminal"
                />
              ) : null}
              {option.mode === "terminal" && terminalSessionActive && terminalAgentWaiting ? (
                <DotScrollLoader
                  className="linear-issue-terminal-session-loader"
                  status="waiting"
                  aria-label="Agent waiting in terminal"
                />
              ) : null}
              {option.mode === "terminal" &&
              terminalSessionActive &&
              !terminalAgentWorking &&
              !terminalAgentWaiting ? (
                <span
                  className="linear-issue-terminal-session-dot"
                  aria-label="Terminal session active"
                />
              ) : null}
              {option.mode === "terminal" && terminalSessionActive ? (
                <span
                  className="linear-issue-terminal-debug-state"
                  title={terminalDebugLabel}
                >
                  {terminalAgentWorking
                    ? "working"
                    : terminalAgentWaiting
                      ? "waiting"
                      : "idle"}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
