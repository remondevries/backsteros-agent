import { useEffect, useId, useRef, useState } from "react";
import { RefreshIcon } from "../RefreshIcon";
import type { LinearWorkoutSetLabel } from "../../lib/workouts/linearWorkoutTypes";
import { PickerSearchField } from "../../settings/PickerSearchField";

function filterLabels(labels: LinearWorkoutSetLabel[], query: string): LinearWorkoutSetLabel[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return labels;

  return labels.filter((label) => label.name.toLowerCase().includes(normalized));
}

function LabelDot({ color }: { color: string }) {
  return (
    <span
      className="workout-set-label-picker-dot"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

export function WorkoutSetLabelPicker({
  value,
  onChange,
  labels,
  loading = false,
  disabled,
  id,
  placeholder = "Select exercise…",
  searchPlaceholder = "Search exercises…",
  loadingLabel = "Loading…",
}: {
  value: string;
  onChange: (labelId: string) => void;
  labels: LinearWorkoutSetLabel[];
  loading?: boolean;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  loadingLabel?: string;
}) {
  const fallbackId = useId();
  const fieldId = id ?? fallbackId;
  const searchFieldId = `${fieldId}-search`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = labels.find((label) => label.id === value) ?? null;
  const filteredLabels = filterLabels(labels, search);
  const labelsUnavailable = labels.length === 0 && !loading;
  const pickerDisabled = disabled || loading || labelsUnavailable;
  const hasSelection = Boolean(value.trim());

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

  function handleSelect(label: LinearWorkoutSetLabel) {
    onChange(label.id);
    closePanel();
  }

  return (
    <div
      ref={rootRef}
      className={`linear-project-picker settings-option-picker workout-set-label-picker ${open ? "linear-project-picker--open" : ""}`}
    >
      <button
        type="button"
        id={fieldId}
        className="linear-project-picker-trigger"
        disabled={pickerDisabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-busy={loading || undefined}
        onClick={() => {
          if (pickerDisabled) return;
          setOpen((current) => !current);
        }}
      >
        {loading ? (
          <span
            className="linear-project-picker-trigger-placeholder linear-project-picker-trigger-loading"
            role="status"
          >
            <RefreshIcon spinning />
            <span>{loadingLabel}</span>
          </span>
        ) : selected ? (
          <span className="workout-set-label-picker-trigger-content">
            <LabelDot color={selected.color} />
            <span className="linear-project-picker-trigger-label">{selected.name}</span>
          </span>
        ) : (
          <span
            className={
              hasSelection
                ? "linear-project-picker-trigger-label"
                : "linear-project-picker-trigger-placeholder"
            }
          >
            {hasSelection ? "Saved exercise" : placeholder}
          </span>
        )}
        <span className="linear-project-picker-trigger-caret" aria-hidden="true" />
      </button>

      {open && (
        <div className="linear-project-picker-panel" role="presentation">
          <PickerSearchField
            id={searchFieldId}
            value={search}
            placeholder={searchPlaceholder}
            ariaLabel={searchPlaceholder}
            onChange={setSearch}
            autoFocus
          />
          <div
            className="linear-project-picker-list settings-option-picker-list"
            role="listbox"
            aria-labelledby={fieldId}
          >
            {filteredLabels.length === 0 ? (
              <p className="linear-project-picker-status">
                {search.trim() ? "No matches found." : "No exercises in the Set label group."}
              </p>
            ) : (
              filteredLabels.map((label) => {
                const isSelected = label.id === value;
                return (
                  <button
                    key={label.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={[
                      "linear-project-picker-option",
                      "settings-option-picker-option",
                      "workout-set-label-picker-option",
                      isSelected ? "linear-project-picker-option--selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => handleSelect(label)}
                  >
                    <span className="workout-set-label-picker-option-content">
                      <LabelDot color={label.color} />
                      <span className="linear-project-picker-option-name">{label.name}</span>
                    </span>
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
