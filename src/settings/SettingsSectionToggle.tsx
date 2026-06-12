export function SettingsSectionToggle<T extends string>({
  value,
  options,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <div
      className="model-mode-toggle settings-section-toggle"
      role="group"
      aria-label={ariaLabel}
      data-mode={value}
    >
      <span className="model-mode-indicator" aria-hidden="true" />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`model-mode-option ${value === option.value ? "active" : ""}`}
          onClick={() => onChange(option.value)}
          disabled={disabled}
          aria-pressed={value === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
