import * as chrono from "chrono-node";
import { formatLinearIssueDueDate } from "../chat/linearIssue";
import { formatMeetingDocumentScheduleLabel } from "./meetingDocumentTitle";

export type NaturalLanguageMeetingDateTimeParseResult =
  | { kind: "datetime"; date: string; time: string | null; label: string }
  | { kind: "clear" }
  | { kind: "invalid" };

const CLEAR_SCHEDULE_PATTERN =
  /^(no date( and time)?|no time|no schedule|clear( date( and time)?)?|remove( date( and time)?)?|unset|none)$/i;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}:\d{2}))?$/;

function dateToLocalYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateToLocalHm(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function resultForSchedule(
  date: string,
  time: string | null,
): NaturalLanguageMeetingDateTimeParseResult {
  const label = formatMeetingDocumentScheduleLabel(date, time);
  if (!label) return { kind: "invalid" };
  return { kind: "datetime", date, time, label };
}

function parseIsoDateTimeInput(trimmed: string): NaturalLanguageMeetingDateTimeParseResult | null {
  const match = ISO_DATE_TIME_PATTERN.exec(trimmed);
  if (!match?.[1]) return null;

  const date = match[1];
  const timeRaw = match[2]?.trim();
  if (!timeRaw) {
    return resultForSchedule(date, null);
  }

  const [hoursText, minutesText] = timeRaw.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return resultForSchedule(date, dateToLocalHm(new Date(2000, 0, 1, hours, minutes)));
}

/** Parse free-text meeting schedule input (e.g. "today at 4pm", "2026-06-14 16:00"). */
export function parseNaturalLanguageMeetingDateTime(
  input: string,
  ref: Date = new Date(),
): NaturalLanguageMeetingDateTimeParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { kind: "invalid" };
  if (CLEAR_SCHEDULE_PATTERN.test(trimmed)) {
    return { kind: "clear" };
  }
  if (ISO_DATE_PATTERN.test(trimmed)) {
    return resultForSchedule(trimmed, null);
  }

  const isoDateTime = parseIsoDateTimeInput(trimmed);
  if (isoDateTime) return isoDateTime;

  const results = chrono.en.casual.parse(trimmed, ref, { forwardDate: true });
  const parsed = results[0];
  if (!parsed) return { kind: "invalid" };

  const dateValue = parsed.start.date();
  if (Number.isNaN(dateValue.getTime())) {
    return { kind: "invalid" };
  }

  const date = dateToLocalYmd(dateValue);
  const hasTime = parsed.start.isCertain("hour") || parsed.start.isCertain("minute");
  const time = hasTime ? dateToLocalHm(dateValue) : null;
  return resultForSchedule(date, time);
}

/** Short preview label for the dropdown while the user types. */
export function naturalLanguageMeetingDateTimePreview(
  input: string,
  ref: Date = new Date(),
): string | null {
  const result = parseNaturalLanguageMeetingDateTime(input, ref);
  if (result.kind === "clear") return "Clear date and time";
  if (result.kind === "datetime") return `Set to ${result.label}`;
  return null;
}

/** Label for preset ISO date-only options in the meeting schedule dropdown. */
export function formatMeetingSchedulePresetDateLabel(ymd: string): string {
  return formatLinearIssueDueDate(ymd) ?? ymd;
}
