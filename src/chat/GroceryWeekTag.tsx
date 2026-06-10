import { forwardRef, useImperativeHandle, useRef } from "react";
import {
  formatCurrentGroceryWeekNumber,
  formatGroceryWeekNumber,
  isValidGroceryWeekNumber,
  normalizeGroceryWeekNumber,
} from "./groceryWeek";

export type GroceryWeekTagHandle = {
  focus: () => void;
  select: () => void;
};

export const GroceryWeekTag = forwardRef<
  GroceryWeekTagHandle,
  {
    value: string;
    onChange: (value: string) => void;
    onUserEdit?: () => void;
    onCommit?: () => void;
    disabled?: boolean;
  }
>(function GroceryWeekTag({ value, onChange, onUserEdit, onCommit, disabled }, ref) {
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
    select: () => {
      inputRef.current?.select();
    },
  }));

  function commitWeek(nextRaw: string) {
    const normalized = normalizeGroceryWeekNumber(nextRaw);
    if (normalized != null) {
      onChange(formatGroceryWeekNumber(normalized));
      return;
    }
    if (isValidGroceryWeekNumber(value)) {
      onChange(value);
      return;
    }
    onChange(formatCurrentGroceryWeekNumber());
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      className="composer-grocery-week-tag composer-grocery-week-input"
      value={value}
      onChange={(event) => {
        onUserEdit?.();
        onChange(event.target.value);
      }}
      onBlur={(event) => commitWeek(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commitWeek(event.currentTarget.value);
          event.currentTarget.blur();
          onCommit?.();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          commitWeek(value);
          event.currentTarget.blur();
          onCommit?.();
        }
      }}
      disabled={disabled}
      aria-label={`Grocery week ${value}`}
      title="Edit week number (Shift+Tab from message)"
      spellCheck={false}
      autoComplete="off"
    />
  );
});
