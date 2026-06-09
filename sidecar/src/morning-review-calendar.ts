import { readFileSync } from "node:fs";
import { OAuth2Client } from "google-auth-library";
import {
  getGoogleCalendarAccountId,
  getGoogleCalendarTokenPath,
  getGoogleOAuthCredentialsPath,
  isGoogleCalendarAuthenticated,
  isGoogleCalendarConfigured,
} from "./config.ts";
import { enrichCalendarResult } from "./enrichers/calendar.ts";
import { formatDateInTimezone, resolveTodayDailyNoteInfo } from "./daily-note.ts";
import type { CalendarEventEntity } from "./types.ts";

interface OAuthCredentials {
  client_id: string;
  client_secret: string;
}

interface GoogleTime {
  dateTime?: string;
  date?: string;
}

interface GoogleEventItem {
  id?: string;
  summary?: string;
  start?: GoogleTime;
  end?: GoogleTime;
  location?: string;
  htmlLink?: string;
  colorId?: string;
}

export interface TodayCalendarSummary {
  events: CalendarEventEntity[];
  firstTimedEvent: { title: string; timeLabel: string } | null;
}

function loadOAuthCredentials(): OAuthCredentials {
  const credentialsPath = getGoogleOAuthCredentialsPath();
  if (!credentialsPath) {
    throw new Error("Google Calendar is not configured");
  }

  const keys = JSON.parse(readFileSync(credentialsPath, "utf8")) as Record<string, unknown>;
  const installed =
    keys.installed && typeof keys.installed === "object"
      ? (keys.installed as Record<string, unknown>)
      : null;

  if (installed?.client_id && installed.client_secret) {
    return {
      client_id: String(installed.client_id),
      client_secret: String(installed.client_secret),
    };
  }

  if (keys.client_id && keys.client_secret) {
    return {
      client_id: String(keys.client_id),
      client_secret: String(keys.client_secret),
    };
  }

  throw new Error("Invalid Google OAuth credentials file format");
}

function loadAccountTokens(accountId: string): Record<string, unknown> {
  const tokenPath = getGoogleCalendarTokenPath();
  const parsed = JSON.parse(readFileSync(tokenPath, "utf8")) as Record<string, unknown>;

  if (typeof parsed.access_token === "string") {
    return parsed;
  }

  const accountTokens = parsed[accountId];
  if (!accountTokens || typeof accountTokens !== "object") {
    throw new Error(`Google Calendar account "${accountId}" is not linked`);
  }

  return accountTokens as Record<string, unknown>;
}

async function getCalendarAuthClient(): Promise<OAuth2Client> {
  if (!isGoogleCalendarConfigured() || !isGoogleCalendarAuthenticated()) {
    throw new Error("Google Calendar is not connected");
  }

  const credentials = loadOAuthCredentials();
  const accountId = getGoogleCalendarAccountId();
  const client = new OAuth2Client({
    clientId: credentials.client_id,
    clientSecret: credentials.client_secret,
  });
  client.setCredentials(loadAccountTokens(accountId));
  return client;
}

function eventStartMs(event: GoogleEventItem): number | null {
  const raw = event.start?.dateTime ?? event.start?.date;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function formatAppointmentTime(iso: string, timezone: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleTimeString(undefined, {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  });
}

function pickFirstTimedEvent(
  events: GoogleEventItem[],
  timezone: string,
): { title: string; timeLabel: string } | null {
  const timed = events
    .filter((event) => event.start?.dateTime && event.summary?.trim())
    .map((event) => ({
      title: event.summary!.trim(),
      startMs: eventStartMs(event) ?? Number.MAX_SAFE_INTEGER,
      timeLabel: formatAppointmentTime(event.start!.dateTime!, timezone),
    }))
    .sort((a, b) => a.startMs - b.startMs);

  const first = timed[0];
  if (!first) return null;
  return { title: first.title, timeLabel: first.timeLabel };
}

export async function fetchCalendarEventsToday(options: {
  timezone?: string;
  now?: Date;
} = {}): Promise<TodayCalendarSummary> {
  const { timezone, date } = resolveTodayDailyNoteInfo(options.timezone, options.now);
  const client = await getCalendarAuthClient();
  const accessToken = await client.getAccessToken();
  if (!accessToken.token) {
    throw new Error("Google Calendar access token is unavailable");
  }

  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeZone", timezone);
  url.searchParams.set("timeMin", `${date}T00:00:00`);
  url.searchParams.set("timeMax", `${date}T23:59:59`);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken.token}` },
  });

  if (!response.ok) {
    throw new Error(`Google Calendar request failed (${response.status})`);
  }

  const body = (await response.json()) as { items?: GoogleEventItem[] };
  const rawEvents = body.items ?? [];
  const firstTimedEvent = pickFirstTimedEvent(rawEvents, timezone);

  const structured = await enrichCalendarResult(
    { events: rawEvents.map((event) => ({ ...event, calendarId: "primary" })) },
    "list-events",
  );

  return {
    events: structured?.type === "calendar_events" ? structured.items : [],
    firstTimedEvent,
  };
}

export function resolveCalendarDayBounds(timezone: string, now = new Date()): {
  date: string;
  timeMin: string;
  timeMax: string;
} {
  const date = formatDateInTimezone(timezone, now);
  return {
    date,
    timeMin: `${date}T00:00:00`,
    timeMax: `${date}T23:59:59`,
  };
}
