export const DAILY_CAPTURE_ACTION_ID = "daily-capture";

export const DAILY_CAPTURE_LABEL = "Daily Capture";

export function isDailyCaptureMessage(quickActionId?: string): boolean {
  return quickActionId === DAILY_CAPTURE_ACTION_ID;
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

export function formatDailyCaptureLogEntry(text: string, date = new Date()): string {
  const body = text.trim();
  if (!body) return "";
  return `- ${formatDailyCaptureLogTime(date)} — Daily capture: ${body}`;
}

export function wrapDailyCaptureLogEntry(entry: string): string {
  return [
    "Append the following single line to today's daily note inside ## Day log.",
    "If ## Day log is missing, create the morning journal structure first:",
    "## Day log",
    "- xx",
    "Append capture bullets after the metric lines and before ## Evening reflection (if present).",
    "Do not modify the line. Do not write outside ## Day log.",
    "",
    entry,
  ].join("\n");
}

export function wrapDailyCaptureForAgent(text: string, date = new Date()): string {
  return wrapDailyCaptureLogEntry(formatDailyCaptureLogEntry(text, date));
}
