import { forwardRef, type KeyboardEventHandler } from "react";

export const PickerSearchField = forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    ariaLabel?: string;
    id?: string;
    onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
    autoFocus?: boolean;
  }
>(function PickerSearchField(
  { value, onChange, placeholder = "Search…", ariaLabel, id, onKeyDown, autoFocus },
  ref,
) {
  return (
    <div className="linear-project-picker-search-wrap">
      <input
        ref={ref}
        id={id}
        type="search"
        className="linear-project-picker-search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        spellCheck={false}
        aria-label={ariaLabel ?? placeholder}
      />
    </div>
  );
});
