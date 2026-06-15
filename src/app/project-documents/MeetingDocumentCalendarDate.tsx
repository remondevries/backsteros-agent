import {
  formatMeetingDocumentScheduleLabel,
  formatMeetingDocumentTimeLabel,
} from "../../lib/meetingDocumentTitle";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function parseYmd(ymd: string): { month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim().slice(0, 10));
  if (!match) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
}

/** Compact calendar column: date tile on top, time below. */
export function MeetingDocumentCalendarDate({
  date,
  time,
}: {
  date: string | null | undefined;
  time: string | null | undefined;
}) {
  const ymd = (date ?? "").trim().slice(0, 10);
  const parts = parseYmd(ymd);
  const timeLabel = formatMeetingDocumentTimeLabel(time);
  const ariaLabel = parts ? formatMeetingDocumentScheduleLabel(ymd, time) : null;
  const monthLabel = parts ? (MONTH_NAMES[parts.month - 1]?.toUpperCase() ?? "") : "—";
  const dayLabel = parts ? String(parts.day) : "—";

  return (
    <span
      className={[
        "meeting-document-calendar-date",
        !parts ? "meeting-document-calendar-date--empty" : null,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={ariaLabel ?? "No date"}
    >
      <span className="meeting-document-calendar-date__tile" aria-hidden="true">
        <span className="meeting-document-calendar-date__month">{monthLabel}</span>
        <span className="meeting-document-calendar-date__day">{dayLabel}</span>
      </span>
      {timeLabel ? (
        <span className="meeting-document-calendar-date__time">{timeLabel}</span>
      ) : null}
    </span>
  );
}
