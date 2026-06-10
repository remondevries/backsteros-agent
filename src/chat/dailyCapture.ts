export const DAILY_CAPTURE_ACTION_ID = "daily-capture";

export const DAILY_CAPTURE_LABEL = "Daily Capture";

export const DAILY_CAPTURE_MESSAGE_LABEL = "Daily log";

export const DAILY_CAPTURE_CONFIRMATION_MESSAGE =
  "Thanks, I added this to your daily log.";

export function isDailyCaptureMessage(quickActionId?: string): boolean {
  return quickActionId === DAILY_CAPTURE_ACTION_ID;
}

export function isDailyCaptureComposerMode(composerQuickActionId?: string | null): boolean {
  return composerQuickActionId === DAILY_CAPTURE_ACTION_ID;
}

export function isDailyCaptureFlowMessage(quickActionId?: string): boolean {
  return isDailyCaptureMessage(quickActionId);
}

export function shouldShowDailyCaptureChip(composerText: string): boolean {
  return /daily note|todays note|today's note/i.test(composerText);
}

export function parseDailyCaptureShortcut(
  text: string,
): { kind: "activate" } | { kind: "send"; body: string } | null {
  const trimmed = text.trim();
  if (!/^\/dc(?:\s|$)/i.test(trimmed)) return null;

  const body = trimmed.replace(/^\/dc\s*/i, "").trim();
  if (!body) return { kind: "activate" };
  return { kind: "send", body };
}

export function formatDailyCaptureLogTime(date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
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

export function formatDailyCaptureLogEntry(text: string, logTime?: string): string {
  const body = text.trim();
  if (!body) return "";
  const normalized = logTime ? normalizeDailyCaptureLogTime(logTime) : null;
  const time = normalized ?? formatDailyCaptureLogTime();
  return `- ${time} — ${body}`;
}

export function parseDailyCaptureLogEntry(text: string): { logTime: string; body: string } | null {
  const match = text.trim().match(/^-\s*((?:[01]\d|2[0-3]):[0-5]\d)\s*—\s*(.+)$/);
  if (!match) return null;
  return { logTime: match[1], body: match[2].trim() };
}
