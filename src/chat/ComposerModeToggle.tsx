import type { ComposerMode } from "./composerMode";

export function ComposerModeToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: ComposerMode;
  onChange: (mode: ComposerMode) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="model-mode-toggle composer-mode-toggle"
      role="group"
      aria-label="Composer mode"
      data-mode={mode}
    >
      <span className="model-mode-indicator" aria-hidden="true" />
      <button
        type="button"
        className={`model-mode-option ${mode === "test" ? "active active-test" : ""}`}
        onClick={() => onChange("test")}
        disabled={disabled}
        aria-pressed={mode === "test"}
      >
        Test
      </button>
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
