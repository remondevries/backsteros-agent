import { useCallback, useMemo } from "react";
import {
  LINEAR_NO_MEETING_SCHEDULE_VALUE,
  meetingScheduleDropdownValue,
  meetingScheduleFromDropdownValue,
} from "../../lib/linearDocumentDetailDropdowns";
import { formatMeetingDocumentScheduleLabel } from "../../lib/meetingDocumentTitle";
import {
  naturalLanguageMeetingDateTimePreview,
  parseNaturalLanguageMeetingDateTime,
  formatMeetingSchedulePresetDateLabel,
} from "../../lib/parseNaturalLanguageMeetingDateTime";
import { searchableDropdownShortcut } from "../ui/searchableDropdownShortcuts";
import { SearchableDropdown, type SearchableDropdownOption } from "../ui/SearchableDropdown";
import { LinearIssueDueDateIcon } from "../project-issues/LinearIssueDetailsPropertyDropdown";

function addLocalDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function formatLinearDueDateYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildMeetingScheduleDropdownOptions(
  currentDate: string | null | undefined,
  currentTime: string | null | undefined,
  now = new Date(),
): SearchableDropdownOption[] {
  const today = formatLinearDueDateYmd(now);
  const tomorrow = formatLinearDueDateYmd(addLocalDays(now, 1));
  const nextWeek = formatLinearDueDateYmd(addLocalDays(now, 7));

  const presetEntries: Array<{ value: string; label: string; searchTerms?: string }> = [
    { value: today, label: "Today", searchTerms: "today" },
    { value: tomorrow, label: "Tomorrow", searchTerms: "tomorrow" },
    { value: nextWeek, label: "In one week", searchTerms: "week 7 days" },
  ];

  const currentValue = meetingScheduleDropdownValue(currentDate, currentTime);
  if (
    currentValue !== LINEAR_NO_MEETING_SCHEDULE_VALUE &&
    !presetEntries.some((entry) => entry.value === currentValue)
  ) {
    presetEntries.unshift({
      value: currentValue,
      label:
        formatMeetingDocumentScheduleLabel(currentDate, currentTime) ??
        formatMeetingSchedulePresetDateLabel(currentDate ?? ""),
      searchTerms: currentValue,
    });
  }

  const options: SearchableDropdownOption[] = presetEntries.map((entry, index) => ({
    ...entry,
    shortcut: searchableDropdownShortcut(index),
  }));

  options.push({
    value: LINEAR_NO_MEETING_SCHEDULE_VALUE,
    label: "No date",
    shortcut: searchableDropdownShortcut(options.length),
    searchTerms: "none clear remove",
  });

  return options;
}

export function MeetingDocumentDateTimePropertyDropdown({
  date,
  time,
  onChange,
  disabled = false,
}: {
  date: string | null;
  time: string | null;
  onChange?: (date: string | null, time: string | null) => void;
  disabled?: boolean;
}) {
  const options = useMemo(
    (): SearchableDropdownOption[] => buildMeetingScheduleDropdownOptions(date, time),
    [date, time],
  );
  const selectedValue = meetingScheduleDropdownValue(date, time);
  const scheduleLabel = formatMeetingDocumentScheduleLabel(date, time);
  const fallbackLabel = scheduleLabel ?? "No date";
  const hasSchedule = Boolean(scheduleLabel);

  const handleChange = useCallback(
    (value: string) => {
      if (!onChange) return;
      const next = meetingScheduleFromDropdownValue(value);
      onChange(next.date, next.time);
    },
    [onChange],
  );

  const handleQuerySubmit = useCallback(
    (query: string) => {
      if (!onChange) return false;
      const result = parseNaturalLanguageMeetingDateTime(query);
      if (result.kind === "clear") {
        onChange(null, null);
        return true;
      }
      if (result.kind === "datetime") {
        onChange(result.date, result.time);
        return true;
      }
      return false;
    },
    [onChange],
  );

  const handleQueryPreview = useCallback(
    (query: string) => naturalLanguageMeetingDateTimePreview(query),
    [],
  );

  return (
    <SearchableDropdown
      value={selectedValue}
      options={options}
      onChange={handleChange}
      disabled={disabled || !onChange}
      searchPlaceholder="Today at 4pm, tomorrow at 9am…"
      searchShortcutLabel="T"
      ariaLabel="Change date and time"
      onQuerySubmit={onChange ? handleQuerySubmit : undefined}
      queryPreviewLabel={onChange ? handleQueryPreview : undefined}
      className="linear-issue-details-property-dropdown"
      panelWidth={280}
      panelAlign="end"
      renderTrigger={({ selected, open, disabled: triggerDisabled, triggerId, onToggle }) => (
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
          disabled={triggerDisabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Change date and time"
          onClick={onToggle}
        >
          <span className="linear-issue-details-row-icon" aria-hidden="true">
            <LinearIssueDueDateIcon active={hasSchedule} />
          </span>
          <span
            className={[
              "linear-issue-details-row-label",
              !hasSchedule ? "linear-issue-details-row-label-muted" : null,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {selected?.label ?? fallbackLabel}
          </span>
        </button>
      )}
    />
  );
}
