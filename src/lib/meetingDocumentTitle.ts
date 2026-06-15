import { formatLinearIssueDueDate } from "../chat/linearIssue";

const MEETING_DOCUMENT_TITLE_PATTERN =
  /^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?\s*-\s*(.*)$/;

export type MeetingDocumentTitleParts = {
  date: string | null;
  time: string | null;
  displayTitle: string;
};

export function parseMeetingDocumentTitle(title: string | null | undefined): MeetingDocumentTitleParts {
  if (!title) {
    return { date: null, time: null, displayTitle: "" };
  }

  const trimmed = title.trim();
  const match = MEETING_DOCUMENT_TITLE_PATTERN.exec(trimmed);
  if (!match) {
    return { date: null, time: null, displayTitle: trimmed };
  }

  return {
    date: match[1] ?? null,
    time: match[2] ?? null,
    displayTitle: (match[3] ?? "").trim(),
  };
}

function normalizeMeetingTime(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (!/^\d{2}:\d{2}$/.test(trimmed)) return null;
  const [hours, minutes] = trimmed.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function buildMeetingDocumentTitle(
  date: string | null | undefined,
  displayTitle: string | null | undefined,
  time?: string | null | undefined,
): string {
  const title = (displayTitle ?? "").trim() || "Untitled";
  const ymd = (date ?? "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return title;
  }

  const normalizedTime = normalizeMeetingTime(time);
  if (normalizedTime) {
    return `${ymd} ${normalizedTime} - ${title}`;
  }
  return `${ymd} - ${title}`;
}

export function meetingDocumentDisplayTitle(title: string | null | undefined): string {
  const { displayTitle } = parseMeetingDocumentTitle(title);
  return displayTitle || (title ?? "").trim() || "Untitled";
}

export function meetingDocumentDateFromTitle(title: string | null | undefined): string | null {
  return parseMeetingDocumentTitle(title).date;
}

export function formatMeetingDocumentTimeLabel(time: string | null | undefined): string | null {
  const normalized = normalizeMeetingTime(time);
  if (!normalized) return null;

  const [hoursText, minutesText] = normalized.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return normalized;

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatMeetingDocumentScheduleLabel(
  date: string | null | undefined,
  time: string | null | undefined,
): string | null {
  const ymd = (date ?? "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;

  const dateLabel = formatLinearIssueDueDate(ymd) ?? ymd;
  const timeLabel = formatMeetingDocumentTimeLabel(time);
  if (timeLabel) return `${dateLabel}, ${timeLabel}`;
  return dateLabel;
}
