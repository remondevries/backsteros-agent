import { useId, useMemo, type RefObject } from "react";
import type { LinearWorkoutSetLabel } from "../../lib/workouts/linearWorkoutTypes";
import {
  findLabelIdForExerciseName,
  hasWorkoutExerciseLabelMatch,
  resolveWorkoutExerciseFromLabels,
} from "../../lib/workouts/workoutExerciseLabelMatch";
import { WorkoutSetLabelPicker } from "./WorkoutSetLabelPicker";

export function WorkoutExerciseField({
  value,
  onChange,
  onBlur,
  labels,
  labelsLoading,
  disabled = false,
  inputClassName,
  placeholder = "Exercise",
  showPicker = false,
  inputRef,
}: {
  value: string;
  onChange: (next: string) => void;
  onBlur?: (value: string, labelId: string | null) => void;
  labels: LinearWorkoutSetLabel[];
  labelsLoading: boolean;
  disabled?: boolean;
  inputClassName?: string;
  placeholder?: string;
  showPicker?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const fallbackId = useId();
  const selectedLabelId = findLabelIdForExerciseName(value, labels);
  const fieldDisabled = disabled || labelsLoading;
  const showMissingLabelHint = useMemo(() => {
    if (labelsLoading || labels.length === 0) {
      return false;
    }
    return !hasWorkoutExerciseLabelMatch(value, labels);
  }, [labels, labelsLoading, value]);

  const handleInputBlur = () => {
    const resolved = resolveWorkoutExerciseFromLabels(value, labels);
    const nextValue = resolved.text !== value ? resolved.text : value;
    if (resolved.text !== value) {
      onChange(resolved.text);
    }
    onBlur?.(nextValue, resolved.labelId);
  };

  const handlePickerChange = (labelId: string) => {
    const selectedLabel = labels.find((label) => label.id === labelId);
    if (!selectedLabel) {
      return;
    }
    onChange(selectedLabel.name);
    onBlur?.(selectedLabel.name, labelId);
  };

  return (
    <div className="workout-exercise-field">
      <div className="workout-exercise-field__input-wrap">
        <input
          ref={inputRef}
          type="text"
          id={fallbackId}
          className={inputClassName ?? "workout-exercise-field__input"}
          value={value}
          placeholder={placeholder}
          disabled={fieldDisabled}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => handleInputBlur()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          aria-label="Exercise name"
          aria-invalid={showMissingLabelHint || undefined}
          autoComplete="off"
        />
        {showMissingLabelHint ? (
          <span className="workout-exercise-field__label-hint" role="status">
            Cannot find a label
          </span>
        ) : null}
      </div>
      {showPicker ? (
        <div className="workout-exercise-field__picker">
          <WorkoutSetLabelPicker
            id={`${fallbackId}-picker`}
            value={selectedLabelId}
            labels={labels}
            loading={labelsLoading}
            disabled={fieldDisabled}
            placeholder="Set label"
            searchPlaceholder="Search exercises…"
            loadingLabel="Loading exercises…"
            onChange={handlePickerChange}
          />
        </div>
      ) : null}
    </div>
  );
}
