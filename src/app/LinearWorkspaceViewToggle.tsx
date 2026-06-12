export type LinearWorkspaceView = "teams" | "projects";

export function LinearWorkspaceViewToggle({
  view,
  onChange,
  disabled,
}: {
  view: LinearWorkspaceView;
  onChange: (view: LinearWorkspaceView) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="model-mode-toggle linear-workspace-toggle"
      role="group"
      aria-label="Linear workspace view"
      data-mode={view}
    >
      <span className="model-mode-indicator" aria-hidden="true" />
      <button
        type="button"
        className={`model-mode-option ${view === "teams" ? "active" : ""}`}
        onClick={() => onChange("teams")}
        disabled={disabled}
        aria-pressed={view === "teams"}
      >
        Teams
      </button>
      <button
        type="button"
        className={`model-mode-option ${view === "projects" ? "active active-max" : ""}`}
        onClick={() => onChange("projects")}
        disabled={disabled}
        aria-pressed={view === "projects"}
      >
        Projects
      </button>
    </div>
  );
}
