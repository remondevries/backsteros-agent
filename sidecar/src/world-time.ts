import { isValidTimezone, loadUserTimezone } from "./context/profile.ts";
import { formatDateInTimezone, formatWeekdayInTimezone } from "./daily-note.ts";

const LOCAL_TIMEZONE_ALIASES = new Set([
  "local",
  "home",
  "me",
  "mine",
  "user",
  "profile",
  "here",
]);

/** Common city and region aliases → IANA timezone ids. */
const TIMEZONE_ALIASES: Record<string, string> = {
  amsterdam: "Europe/Amsterdam",
  athens: "Europe/Athens",
  auckland: "Pacific/Auckland",
  bangkok: "Asia/Bangkok",
  beijing: "Asia/Shanghai",
  berlin: "Europe/Berlin",
  boston: "America/New_York",
  brisbane: "Australia/Brisbane",
  brooklyn: "America/New_York",
  cairo: "Africa/Cairo",
  chicago: "America/Chicago",
  delhi: "Asia/Kolkata",
  denver: "America/Denver",
  dubai: "Asia/Dubai",
  dublin: "Europe/Dublin",
  gmt: "UTC",
  hong_kong: "Asia/Hong_Kong",
  honolulu: "Pacific/Honolulu",
  houston: "America/Chicago",
  istanbul: "Europe/Istanbul",
  jakarta: "Asia/Jakarta",
  jerusalem: "Asia/Jerusalem",
  johannesburg: "Africa/Johannesburg",
  la: "America/Los_Angeles",
  lisbon: "Europe/Lisbon",
  london: "Europe/London",
  los_angeles: "America/Los_Angeles",
  madrid: "Europe/Madrid",
  manila: "Asia/Manila",
  melbourne: "Australia/Melbourne",
  mexico_city: "America/Mexico_City",
  miami: "America/New_York",
  montreal: "America/Toronto",
  moscow: "Europe/Moscow",
  mumbai: "Asia/Kolkata",
  new_york: "America/New_York",
  nyc: "America/New_York",
  oslo: "Europe/Oslo",
  paris: "Europe/Paris",
  perth: "Australia/Perth",
  rome: "Europe/Rome",
  san_francisco: "America/Los_Angeles",
  sao_paulo: "America/Sao_Paulo",
  seattle: "America/Los_Angeles",
  seoul: "Asia/Seoul",
  sf: "America/Los_Angeles",
  shanghai: "Asia/Shanghai",
  singapore: "Asia/Singapore",
  stockholm: "Europe/Stockholm",
  sydney: "Australia/Sydney",
  taipei: "Asia/Taipei",
  tokyo: "Asia/Tokyo",
  toronto: "America/Toronto",
  utc: "UTC",
  vancouver: "America/Vancouver",
  vienna: "Europe/Vienna",
  warsaw: "Europe/Warsaw",
  zurich: "Europe/Zurich",
};

function normalizeLocationQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/,/g, " ")
    .replace(/\s+/g, "_");
}

export function resolveTimezoneQuery(
  query: string,
  options?: { userTimezone?: string },
): string | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  if (isValidTimezone(trimmed)) {
    return trimmed;
  }

  const normalized = normalizeLocationQuery(trimmed);
  if (LOCAL_TIMEZONE_ALIASES.has(normalized)) {
    const userTimezone = options?.userTimezone ?? loadUserTimezone();
    return isValidTimezone(userTimezone) ? userTimezone : "UTC";
  }

  const direct = TIMEZONE_ALIASES[normalized];
  if (direct) {
    return direct;
  }

  const compact = normalized.replace(/_/g, "");
  for (const [alias, timezone] of Object.entries(TIMEZONE_ALIASES)) {
    if (alias.replace(/_/g, "") === compact) {
      return timezone;
    }
  }

  return null;
}

export function formatTimezoneOffsetLabel(timezone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
  }).formatToParts(now);
  return parts.find((part) => part.type === "timeZoneName")?.value ?? "UTC";
}

export function formatTimezoneShortName(timezone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "short",
  }).formatToParts(now);
  return parts.find((part) => part.type === "timeZoneName")?.value ?? timezone;
}

export function formatWorldTimeLine(
  label: string,
  timezone: string,
  now = new Date(),
): string {
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const date = formatDateInTimezone(timezone, now);
  const weekday = formatWeekdayInTimezone(timezone, now);
  const offset = formatTimezoneOffsetLabel(timezone, now);
  const shortName = formatTimezoneShortName(timezone, now);

  return `${label} (${timezone}) — ${weekday} ${date} ${time} ${shortName} (${offset})`;
}

export function lookupWorldTimes(
  locations: string[],
  options?: { userTimezone?: string; now?: Date },
): string {
  const now = options?.now ?? new Date();
  const userTimezone = options?.userTimezone ?? loadUserTimezone();
  const uniqueQueries = [...new Set(locations.map((location) => location.trim()).filter(Boolean))];

  if (uniqueQueries.length === 0) {
    return formatWorldTimeLine("Local time", userTimezone, now);
  }

  const lines: string[] = [];
  const unknown: string[] = [];

  for (const query of uniqueQueries) {
    const timezone = resolveTimezoneQuery(query, { userTimezone });
    if (!timezone) {
      unknown.push(query);
      continue;
    }
    lines.push(formatWorldTimeLine(query, timezone, now));
  }

  if (lines.length === 0) {
    return [
      "Could not resolve any timezones.",
      unknown.length > 0
        ? `Unknown locations: ${unknown.join(", ")}. Try a city name (Tokyo, London) or an IANA timezone (Europe/Amsterdam).`
        : "Pass city names or IANA timezones such as America/New_York.",
    ].join("\n");
  }

  const output = lines.join("\n");
  if (unknown.length === 0) {
    return output;
  }

  return `${output}\nUnknown locations: ${unknown.join(", ")}. Try a city name or IANA timezone id.`;
}
