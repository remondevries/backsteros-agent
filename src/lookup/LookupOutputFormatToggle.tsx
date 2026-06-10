import {
  LOOKUP_OUTPUT_FORMAT_OPTIONS,
  type LookupOutputFormat,
} from "./lookupOutputFormat";

const FORMAT_TOGGLE_LABELS: Record<LookupOutputFormat, string> = {
  default: "Default",
  bullets: "Bullets",
  "action-items": "Actions",
  outline: "Outline",
};

export function LookupOutputFormatToggle({
  format,
  onChange,
  disabled,
}: {
  format: LookupOutputFormat;
  onChange: (format: LookupOutputFormat) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="model-mode-toggle lookup-output-format-toggle"
      role="group"
      aria-label="Response format"
      data-mode={format}
    >
      <span className="model-mode-indicator" aria-hidden="true" />
      {LOOKUP_OUTPUT_FORMAT_OPTIONS.map((option) => {
        const active = format === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={`model-mode-option ${active ? (option.value === "default" ? "active" : "active active-max") : ""}`}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            aria-pressed={active}
            title={option.label}
          >
            {FORMAT_TOGGLE_LABELS[option.value]}
          </button>
        );
      })}
    </div>
  );
}
