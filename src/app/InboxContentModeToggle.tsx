export type InboxContentMode = "issues" | "documents";

export function InboxContentModeToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: InboxContentMode;
  onChange: (mode: InboxContentMode) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="model-mode-toggle inbox-content-toggle"
      role="group"
      aria-label="Inbox content type"
      data-mode={mode}
    >
      <span className="model-mode-indicator" aria-hidden="true" />
      <button
        type="button"
        className={`model-mode-option ${mode === "issues" ? "active" : ""}`}
        onClick={() => onChange("issues")}
        disabled={disabled}
        aria-pressed={mode === "issues"}
      >
        Issues
      </button>
      <button
        type="button"
        className={`model-mode-option ${mode === "documents" ? "active active-max" : ""}`}
        onClick={() => onChange("documents")}
        disabled={disabled}
        aria-pressed={mode === "documents"}
      >
        Documents
      </button>
    </div>
  );
}
