import type { ReactNode } from "react";
import {
  SearchableDropdown,
  type SearchableDropdownOption,
} from "../ui/SearchableDropdown";

export function LinearIssueDetailsPropertyDropdown({
  value,
  options,
  onChange,
  searchPlaceholder,
  searchShortcutLabel = "S",
  ariaLabel,
  fallbackIcon,
  fallbackLabel,
}: {
  value: string | null;
  options: SearchableDropdownOption[];
  onChange?: (value: string) => void;
  searchPlaceholder: string;
  searchShortcutLabel?: string;
  ariaLabel: string;
  fallbackIcon: ReactNode;
  fallbackLabel: string;
}) {
  if (options.length === 0) {
    return (
      <div className="linear-issue-details-row">
        <span className="linear-issue-details-row-icon" aria-hidden="true">
          {fallbackIcon}
        </span>
        <span className="linear-issue-details-row-label">{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <SearchableDropdown
      value={value}
      options={options}
      onChange={onChange}
      searchPlaceholder={searchPlaceholder}
      searchShortcutLabel={searchShortcutLabel}
      ariaLabel={ariaLabel}
      className="linear-issue-details-property-dropdown"
      panelWidth={280}
      panelAlign="end"
      renderTrigger={({ selected, open, disabled, triggerId, onToggle }) => (
        <button
          type="button"
          id={triggerId}
          className={[
            "linear-issue-details-row",
            "linear-issue-details-row--interactive",
            open ? "linear-issue-details-row--open" : null,
          ]
            .filter(Boolean)
            .join(" ")}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
          onClick={onToggle}
        >
          <span className="linear-issue-details-row-icon" aria-hidden="true">
            {selected?.icon ?? fallbackIcon}
          </span>
          <span className="linear-issue-details-row-label">
            {selected?.label ?? fallbackLabel}
          </span>
        </button>
      )}
    />
  );
}

export function LinearIssueNoEstimateIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.666 3.77a.75.75 0 0 0-1.329 0L6.033 6.26l-1.329-.696 1.305-2.49c.842-1.609 3.144-1.609 3.986 0l1.305 2.49-1.33.696-1.304-2.49ZM9.545 13v1.5h2.717c1.691 0 2.778-1.795 1.993-3.293l-1.304-2.49-1.329.695 1.305 2.49a.75.75 0 0 1-.665 1.099H9.545ZM4.382 9.413l-1.33-.696-1.304 2.49c-.785 1.499.302 3.295 1.993 3.295H6.46V13H3.74a.75.75 0 0 1-.664-1.098l1.305-2.49Z"
      />
    </svg>
  );
}

export function LinearIssueEstimateIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.741 14.5H12.262C13.953 14.5 15.04 12.705 14.255 11.207L9.995 3.073C9.153 1.465 6.851 1.465 6.009 3.073L1.749 11.207C0.962 12.705 2.051 14.5 3.741 14.5ZM8 3.368C7.863 3.367 7.729 3.405 7.612 3.475C7.495 3.546 7.4 3.648 7.337 3.77L3.077 11.904C3.018 12.018 2.989 12.146 2.993 12.274C2.997 12.403 3.034 12.528 3.101 12.639C3.168 12.749 3.262 12.84 3.374 12.903C3.486 12.966 3.612 13 3.741 13H8V3.368Z"
        fill="#FFFFFF80"
      />
    </svg>
  );
}
