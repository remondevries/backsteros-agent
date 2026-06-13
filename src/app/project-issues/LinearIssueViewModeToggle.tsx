export type LinearIssueViewMode = "issue" | "terminal";

const VIEW_MODE_OPTIONS: readonly { mode: LinearIssueViewMode; label: string }[] = [
  { mode: "issue", label: "Issue" },
  { mode: "terminal", label: "Terminal" },
] as const;

export function LinearIssueViewModeToggle({
  mode,
  onChange,
}: {
  mode: LinearIssueViewMode;
  onChange: (mode: LinearIssueViewMode) => void;
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
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
