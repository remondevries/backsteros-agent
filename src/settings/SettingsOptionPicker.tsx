import { useEffect, useId, useRef, useState } from "react";
import { PickerSearchField } from "./PickerSearchField";
import { SettingsPickerOptionRow } from "./SettingsPickerBadge";

export type SettingsOption<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
};

function filterSettingsOptions<T extends string>(
  options: SettingsOption<T>[],
  query: string,
): SettingsOption<T>[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return options;

  return options.filter((option) => {
    const haystack = `${option.label} ${option.description ?? ""}`.trim().toLowerCase();
    return haystack.includes(normalized);
  });
}

export function SettingsOptionPicker<T extends string>({
  value,
  onChange,
  options,
  disabled,
  id,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  searchable = true,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SettingsOption<T>[];
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  searchable?: boolean;
}) {
  const fallbackId = useId();
  const fieldId = id ?? fallbackId;
  const searchFieldId = `${fieldId}-search`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = options.find((option) => option.value === value) ?? null;
  const filteredOptions = filterSettingsOptions(options, search);
  const showSearch = searchable && options.length > 0;

  function closePanel() {
    setOpen(false);
    setSearch("");
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        closePanel();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function handleSelect(nextValue: T) {
    onChange(nextValue);
    closePanel();
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
          {showSearch ? (
            <PickerSearchField
              id={searchFieldId}
              value={search}
              placeholder={searchPlaceholder}
              ariaLabel={searchPlaceholder}
              onChange={setSearch}
              autoFocus
            />
          ) : null}
          <div
            className="linear-project-picker-list settings-option-picker-list"
            role="listbox"
            aria-labelledby={fieldId}
          >
            {filteredOptions.length === 0 ? (
              <p className="linear-project-picker-status">
                {search.trim() ? "No matches found." : "No options available."}
              </p>
            ) : (
              filteredOptions.map((option) => {
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
                    <SettingsPickerOptionRow
                      label={option.label}
                      badge={option.description}
                    />
                    {isSelected && (
                      <span className="linear-project-picker-option-check" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
