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
  const activeIndex = mode === "issues" ? 0 : 1;

  return (
    <div
      className="model-mode-toggle inbox-content-toggle"
      role="group"
      aria-label="Inbox content type"
      data-mode={mode}
      data-active-index={activeIndex}
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
        className={`model-mode-option ${mode === "documents" ? "active" : ""}`}
        onClick={() => onChange("documents")}
        disabled={disabled}
        aria-pressed={mode === "documents"}
      >
        Documents
      </button>
    </div>
  );
}
