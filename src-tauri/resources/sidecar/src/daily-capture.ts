import { buildUpdateConfirmationToken } from "./update-confirmation.ts";

export const DAILY_CAPTURE_QUICK_ACTION_ID = "daily-capture";

export const DAILY_CAPTURE_CONFIRMATION_MESSAGE =
  "Thanks, I added this to your daily log.";

export function isDailyCaptureQuickAction(quickActionId?: string): boolean {
  return quickActionId === DAILY_CAPTURE_QUICK_ACTION_ID;
}

export function formatDailyCaptureLogTime(timezone: string, date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function isValidDailyCaptureLogTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
}

export function normalizeDailyCaptureLogTime(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{1,2}):(\d{1,2})$/);
  if (match) {
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  if (/^\d{3,4}$/.test(trimmed)) {
    const padded = trimmed.padStart(4, "0");
    const hours = Number(padded.slice(0, -2));
    const minutes = Number(padded.slice(-2));
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  return null;
}

export function formatDailyCaptureLogEntry(
  text: string,
  timezone: string,
  options: { now?: Date; logTime?: string } = {},
): string {
  const body = text.trim();
  if (!body) return "";
  const normalized = options.logTime ? normalizeDailyCaptureLogTime(options.logTime) : null;
  const time = normalized ?? formatDailyCaptureLogTime(timezone, options.now);
  return `- ${time} — ${body}`;
}

export function buildDailyCaptureResponse(): string {
  return buildUpdateConfirmationToken(
    "entry",
    "daily log",
    DAILY_CAPTURE_CONFIRMATION_MESSAGE,
  );
}
