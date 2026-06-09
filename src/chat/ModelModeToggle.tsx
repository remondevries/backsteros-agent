import type { ModelMode } from "./types";

export function ModelModeToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: ModelMode;
  onChange: (mode: ModelMode) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="model-mode-toggle"
      role="group"
      aria-label="Model mode"
      data-mode={mode}
    >
      <span className="model-mode-indicator" aria-hidden="true" />
      <button
        type="button"
        className={`model-mode-option ${mode === "auto" ? "active" : ""}`}
        onClick={() => onChange("auto")}
        disabled={disabled}
        aria-pressed={mode === "auto"}
      >
        Auto
      </button>
      <button
        type="button"
        className={`model-mode-option ${mode === "max" ? "active active-max" : ""}`}
        onClick={() => onChange("max")}
        disabled={disabled}
        aria-pressed={mode === "max"}
      >
        Max
      </button>
    </div>
  );
}
