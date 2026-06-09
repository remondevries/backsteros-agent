import { loadUserTimezone } from "./profile.ts";

export function formatNowContext(timezone: string, now = new Date()): string {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  }).format(now);

  return `[Now]\n${date}, ${weekday} — ${timezone}`;
}

export function loadNowContext(now = new Date()): string {
  return formatNowContext(loadUserTimezone(), now);
}
