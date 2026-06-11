import { useEffect, useId, useRef, useState } from "react";

export type SettingsOption<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
};

export function SettingsOptionPicker<T extends string>({
  value,
  onChange,
  options,
  disabled,
  id,
  placeholder = "Select…",
}: {
  value: T;
  onChange: (value: T) => void;
  options: SettingsOption<T>[];
  disabled?: boolean;
  id?: string;
  placeholder?: string;
}) {
  const fallbackId = useId();
  const fieldId = id ?? fallbackId;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => option.value === value) ?? null;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function handleSelect(nextValue: T) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className={`linear-project-picker settings-option-picker ${open ? "linear-project-picker--open" : ""}`}
    >
      <button
        type="button"
        id={fieldId}
        className="linear-project-picker-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
      >
        <span
          className={
            selected
              ? "linear-project-picker-trigger-label"
              : "linear-project-picker-trigger-placeholder"
          }
        >
          {selected?.label ?? placeholder}
        </span>
        <span className="linear-project-picker-trigger-caret" aria-hidden="true" />
      </button>

      {open && (
        <div className="linear-project-picker-panel" role="presentation">
          <div className="linear-project-picker-list settings-option-picker-list" role="listbox" aria-labelledby={fieldId}>
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={[
                    "linear-project-picker-option",
                    "settings-option-picker-option",
                    isSelected ? "linear-project-picker-option--selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleSelect(option.value)}
                >
                  <span className="settings-option-picker-option-copy">
                    <span className="linear-project-picker-option-name">{option.label}</span>
                    {option.description && (
                      <span className="settings-option-picker-option-description">
                        {option.description}
                      </span>
                    )}
                  </span>
                  {isSelected && (
                    <span className="linear-project-picker-option-check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
