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

export function formatDailyCaptureLogEntry(
  text: string,
  timezone: string,
  date = new Date(),
): string {
  const body = text.trim();
  if (!body) return "";
  return `- ${formatDailyCaptureLogTime(timezone, date)} — ${body}`;
}

export function buildDailyCaptureResponse(): string {
  return buildUpdateConfirmationToken(
    "entry",
    "daily log",
    DAILY_CAPTURE_CONFIRMATION_MESSAGE,
  );
}
