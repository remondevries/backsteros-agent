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
}: {
  mode: LinearIssueViewMode;
  onChange: (mode: LinearIssueViewMode) => void;
  terminalSessionActive?: boolean;
  terminalAgentWorking?: boolean;
  terminalAgentWaiting?: boolean;
}) {
  const activeIndex = mode === "issue" ? 0 : 1;

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
            </span>
          </button>
        );
      })}
    </div>
  );
}
