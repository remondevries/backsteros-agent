import type { LookupSearchMode } from "./lookupSearchMode";

export function LookupSearchModeToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: LookupSearchMode;
  onChange: (mode: LookupSearchMode) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="model-mode-toggle lookup-search-mode-toggle"
      role="group"
      aria-label="Gemini search mode"
      data-mode={mode}
    >
      <span className="model-mode-indicator" aria-hidden="true" />
      <button
        type="button"
        className={`model-mode-option ${mode === "web" ? "active" : ""}`}
        onClick={() => onChange("web")}
        disabled={disabled}
        aria-pressed={mode === "web"}
        title="Search the web and read linked URLs"
      >
        Web
      </button>
      <button
        type="button"
        className={`model-mode-option ${mode === "docs" ? "active active-max" : ""}`}
        onClick={() => onChange("docs")}
        disabled={disabled}
        aria-pressed={mode === "docs"}
        title="Files and URLs only — no web search quota"
      >
        Docs
      </button>
    </div>
  );
}
