import { forwardRef, useImperativeHandle, useRef } from "react";
import {
  formatDailyCaptureLogTime,
  isValidDailyCaptureLogTime,
  normalizeDailyCaptureLogTime,
} from "./dailyCapture";

export type DailyCaptureTimeTagHandle = {
  focus: () => void;
  select: () => void;
};

export const DailyCaptureTimeTag = forwardRef<
  DailyCaptureTimeTagHandle,
  {
    value: string;
    onChange: (value: string) => void;
    onUserEdit?: () => void;
    onCommit?: () => void;
    disabled?: boolean;
  }
>(function DailyCaptureTimeTag({ value, onChange, onUserEdit, onCommit, disabled }, ref) {
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
    select: () => {
      inputRef.current?.select();
    },
  }));

  function commitTime(nextRaw: string) {
    const normalized = normalizeDailyCaptureLogTime(nextRaw);
    if (normalized) {
      onChange(normalized);
      return;
    }
    if (isValidDailyCaptureLogTime(value)) {
      onChange(value);
      return;
    }
    onChange(formatDailyCaptureLogTime());
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      className="composer-daily-capture-time-tag composer-daily-capture-time-input"
      value={value}
      onChange={(event) => {
        onUserEdit?.();
        onChange(event.target.value);
      }}
      onBlur={(event) => commitTime(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commitTime(event.currentTarget.value);
          event.currentTarget.blur();
          onCommit?.();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          commitTime(value);
          event.currentTarget.blur();
          onCommit?.();
        }
      }}
      disabled={disabled}
      aria-label={`Log time ${value}`}
      title="Edit log time (Shift+Tab from message)"
      spellCheck={false}
      autoComplete="off"
    />
  );
});
