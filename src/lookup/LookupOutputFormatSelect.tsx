import {
  LOOKUP_OUTPUT_FORMAT_OPTIONS,
  type LookupOutputFormat,
} from "./lookupOutputFormat";

export function LookupOutputFormatSelect({
  format,
  onChange,
  disabled,
}: {
  format: LookupOutputFormat;
  onChange: (format: LookupOutputFormat) => void;
  disabled?: boolean;
}) {
  return (
    <label className="lookup-output-format-select">
      <span className="lookup-output-format-label">Format</span>
      <select
        value={format}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as LookupOutputFormat)}
        aria-label="Response format"
      >
        {LOOKUP_OUTPUT_FORMAT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
