import type { LookupDepthMode } from "./lookupDepth";

export function LookupDepthToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: LookupDepthMode;
  onChange: (mode: LookupDepthMode) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="model-mode-toggle lookup-depth-toggle"
      role="group"
      aria-label="Gemini depth mode"
      data-mode={mode}
    >
      <span className="model-mode-indicator" aria-hidden="true" />
      <button
        type="button"
        className={`model-mode-option ${mode === "fast" ? "active" : ""}`}
        onClick={() => onChange("fast")}
        disabled={disabled}
        aria-pressed={mode === "fast"}
      >
        Fast
      </button>
      <button
        type="button"
        className={`model-mode-option ${mode === "deep" ? "active active-max" : ""}`}
        onClick={() => onChange("deep")}
        disabled={disabled}
        aria-pressed={mode === "deep"}
      >
        Deep
      </button>
    </div>
  );
}
