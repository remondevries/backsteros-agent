import type { CalendarEventEntity, StructuredPayload } from "../types.ts";

interface GoogleTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

interface GoogleEventRecord {
  id?: string;
  summary?: string;
  location?: string;
  htmlLink?: string;
  colorId?: string;
  calendarId?: string;
  start?: GoogleTime;
  end?: GoogleTime;
  organizer?: { displayName?: string; email?: string };
}

interface CalendarRecord {
  id?: string;
  summary?: string;
  backgroundColor?: string;
  colorId?: string;
}

interface ColorDefinition {
  background?: string;
  foreground?: string;
}

const DEFAULT_CALENDAR_COLOR = "#4986e7";

const GOOGLE_CALENDAR_COLORS: Record<string, string> = {
  "1": "#ac725e",
  "2": "#d06b64",
  "3": "#f83a22",
  "4": "#fa573c",
  "5": "#ff7537",
  "6": "#ffad46",
  "7": "#42d692",
  "8": "#16a765",
  "9": "#7bd148",
  "10": "#b3dc6c",
  "11": "#fbe983",
  "12": "#fad165",
  "13": "#92e1c0",
  "14": "#9fe1e7",
  "15": "#9fc6e7",
  "16": "#4986e7",
  "17": "#9a9cff",
  "18": "#b99aff",
  "19": "#c2c2c2",
  "20": "#cabdbf",
  "21": "#cca6ac",
  "22": "#f691b2",
  "23": "#cd74e6",
  "24": "#a47ae2",
};

const GOOGLE_EVENT_COLORS: Record<string, string> = {
  "1": "#a4bdfc",
  "2": "#7ae7bf",
  "3": "#dbadff",
  "4": "#ff887c",
  "5": "#fbd75b",
  "6": "#ffb878",
  "7": "#46d6db",
  "8": "#e1e1e1",
  "9": "#5484ed",
  "10": "#51b749",
  "11": "#dc2127",
};

const calendarById = new Map<string, CalendarRecord>();
let calendarColorPalette = { ...GOOGLE_CALENDAR_COLORS };
let eventColorPalette = { ...GOOGLE_EVENT_COLORS };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function calendarArgs(args?: unknown): Record<string, unknown> {
  const root = args && typeof args === "object" ? (args as Record<string, unknown>) : {};
  const nested =
    root.args && typeof root.args === "object" ? (root.args as Record<string, unknown>) : {};
  return { ...nested, ...root };
}

function resolveCalendarToolName(toolName: string, args?: unknown): string {
  const argsObj = calendarArgs(args);
  const inner = typeof argsObj.toolName === "string" ? argsObj.toolName : undefined;
  return (inner ?? toolName).toLowerCase();
}

function parseMcpContentItems(content: unknown, payloads: unknown[]) {
  if (!Array.isArray(content)) return;

  for (const item of content) {
    const itemRecord = asRecord(item);
    if (typeof itemRecord?.text === "string") {
      try {
        payloads.push(JSON.parse(itemRecord.text));
      } catch {
        payloads.push(itemRecord.text);
      }
      continue;
    }

    const textBlock = asRecord(itemRecord?.text);
    const innerText = textBlock?.text;
    if (typeof innerText === "string") {
      try {
        payloads.push(JSON.parse(innerText));
      } catch {
        payloads.push(innerText);
      }
    }
  }
}

function unwrapMcpPayload(result: unknown): unknown[] {
  const payloads: unknown[] = [];
  const record = asRecord(result);
  if (!record) return [result];

  if (record.status === "success" && record.value !== undefined) {
    const value = record.value;
    const valueRecord = asRecord(value);
    parseMcpContentItems(valueRecord?.content, payloads);
    if (payloads.length === 0) {
      payloads.push(value);
    }
    return payloads;
  }

  // Bare MCP tool output: { content: [{ type: "text", text: "..." }] }
  parseMcpContentItems(record.content, payloads);
  if (payloads.length > 0) {
    return payloads;
  }

  return [result];
}

function mergeColorPalette(
  target: Record<string, string>,
  source?: Record<string, ColorDefinition>,
) {
  if (!source) return;
  for (const [id, color] of Object.entries(source)) {
    if (color.background) {
      target[id] = color.background;
    }
  }
}

function rememberCalendar(calendar: CalendarRecord) {
  if (!calendar.id) return;
  calendarById.set(calendar.id, {
    id: calendar.id,
    summary: calendar.summary,
    backgroundColor: calendar.backgroundColor,
    colorId: calendar.colorId,
  });
}

function ingestCalendars(payload: Record<string, unknown>) {
  const calendars = payload.calendars;
  if (!Array.isArray(calendars)) return;

  for (const entry of calendars) {
    const record = asRecord(entry);
    if (!record) continue;
    rememberCalendar({
      id: typeof record.id === "string" ? record.id : undefined,
      summary: typeof record.summary === "string" ? record.summary : undefined,
      backgroundColor:
        typeof record.backgroundColor === "string" ? record.backgroundColor : undefined,
      colorId: typeof record.colorId === "string" ? record.colorId : undefined,
    });
  }
}

function looksLikeColorPalette(record: Record<string, unknown>): boolean {
  for (const value of Object.values(record)) {
    const def = asRecord(value);
    if (def && typeof def.background === "string") {
      return true;
    }
  }
  return false;
}

function ingestColorPalette(payload: Record<string, unknown>) {
  const calendar = asRecord(payload.calendar);
  const event = asRecord(payload.event);
  if (calendar && looksLikeColorPalette(calendar)) {
    mergeColorPalette(calendarColorPalette, calendar as Record<string, ColorDefinition>);
  }
  if (event && looksLikeColorPalette(event)) {
    mergeColorPalette(eventColorPalette, event as Record<string, ColorDefinition>);
  }
}

function calendarColorFromId(colorId?: string): string | undefined {
  if (!colorId) return undefined;
  return calendarColorPalette[colorId] ?? GOOGLE_CALENDAR_COLORS[colorId];
}

function eventColorFromId(colorId?: string): string | undefined {
  if (!colorId) return undefined;
  return eventColorPalette[colorId] ?? GOOGLE_EVENT_COLORS[colorId];
}

function resolveCalendarColor(calendarId?: string, eventColorId?: string): string | undefined {
  if (eventColorId) {
    return eventColorFromId(eventColorId);
  }

  if (!calendarId) return undefined;

  const calendar = calendarById.get(calendarId);
  if (calendar?.backgroundColor) {
    return calendar.backgroundColor;
  }

  if (calendar?.colorId) {
    return calendarColorFromId(calendar.colorId);
  }

  if (calendarId === "primary") {
    return DEFAULT_CALENDAR_COLOR;
  }

  return undefined;
}

function resolveCalendarName(calendarId?: string, organizer?: GoogleEventRecord["organizer"]) {
  if (calendarId) {
    const calendar = calendarById.get(calendarId);
    if (calendar?.summary) return calendar.summary;
  }

  if (organizer?.displayName) return organizer.displayName;
  if (organizer?.email) return organizer.email.split("@")[0];
  if (calendarId === "primary") return "Primary";
  return undefined;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function relativeDayLabel(date: Date, now: Date): string | null {
  const diffDays = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  return null;
}

function parseGoogleDate(value?: GoogleTime): Date | undefined {
  if (!value) return undefined;
  const raw = value.dateTime ?? value.date;
  if (!raw) return undefined;

  if (value.dateTime) {
    const parsed = new Date(value.dateTime);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  const parsed = new Date(`${raw}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatTime(date: Date, allDay: boolean): string {
  if (allDay) {
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  const now = new Date();
  const relative = relativeDayLabel(date, now);
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (relative) return `${relative} · ${time}`;
  return `${date.toLocaleDateString(undefined, { weekday: "short" })} · ${time}`;
}

function formatEventTimes(start?: GoogleTime, end?: GoogleTime): { start?: string; end?: string } {
  const startDate = parseGoogleDate(start);
  if (!startDate) return {};

  const endDate = parseGoogleDate(end);
  const allDay = Boolean(start?.date && !start.dateTime);

  if (!endDate) {
    return { start: formatTime(startDate, allDay) };
  }

  if (allDay) {
    const sameDay = startOfDay(startDate).getTime() === startOfDay(endDate).getTime();
    if (sameDay) {
      return { start: formatTime(startDate, true) };
    }
    return {
      start: formatTime(startDate, true),
      end: formatTime(endDate, true),
    };
  }

  const sameDay = startOfDay(startDate).getTime() === startOfDay(endDate).getTime();
  return {
    start: formatTime(startDate, false),
    end: sameDay
      ? endDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
      : formatTime(endDate, false),
  };
}

function parseGoogleEvent(raw: GoogleEventRecord): CalendarEventEntity | undefined {
  if (!raw.id) return undefined;

  const title = raw.summary?.trim();
  if (!title) return undefined;

  const times = formatEventTimes(raw.start, raw.end);

  return {
    id: raw.id,
    title,
    start: times.start,
    end: times.end,
    calendarName: resolveCalendarName(raw.calendarId, raw.organizer),
    calendarColor: resolveCalendarColor(raw.calendarId, raw.colorId),
    location: raw.location,
    url: raw.htmlLink,
  };
}

function collectEvents(payload: Record<string, unknown>, items: CalendarEventEntity[]) {
  if (Array.isArray(payload.events)) {
    for (const entry of payload.events) {
      const parsed = parseGoogleEvent(asRecord(entry) as GoogleEventRecord);
      if (parsed) items.push(parsed);
    }
  }

  const singleEvent = asRecord(payload.event);
  if (singleEvent) {
    const parsed = parseGoogleEvent(singleEvent as GoogleEventRecord);
    if (parsed) items.push(parsed);
  }
}

function isCalendarListTool(toolName: string): boolean {
  const name = toolName.toLowerCase();
  return /(?:^|[-_])list-calendars(?:$|[-_])/.test(name);
}

function isCalendarColorsTool(toolName: string): boolean {
  const name = toolName.toLowerCase();
  return /(?:^|[-_])list-colors(?:$|[-_])/.test(name);
}

function isCalendarCreateTool(toolName: string): boolean {
  const name = toolName.toLowerCase();
  return /(?:^|[-_])create-event(?:$|[-_])/.test(name);
}

function isCalendarEventTool(toolName: string): boolean {
  const name = toolName.toLowerCase();
  return /(?:^|[-_])(list-events|search-events|get-event|create-event|update-event)(?:$|[-_])/.test(
    name,
  );
}


function processCalendarPayload(
  record: Record<string, unknown>,
  items: CalendarEventEntity[],
  effectiveToolName: string,
) {
  if (Array.isArray(record.calendars) || isCalendarListTool(effectiveToolName)) {
    ingestCalendars(record);
  }

  if (isCalendarColorsTool(effectiveToolName)) {
    ingestColorPalette(record);
  }

  if (
    Array.isArray(record.events) ||
    asRecord(record.event) ||
    isCalendarEventTool(effectiveToolName)
  ) {
    collectEvents(record, items);
  }
}

export function enrichCalendarResult(
  result: unknown,
  toolName: string,
  args?: unknown,
): StructuredPayload | undefined {
  const items: CalendarEventEntity[] = [];
  const effectiveToolName = resolveCalendarToolName(toolName, args);

  for (const payload of unwrapMcpPayload(result)) {
    const record = asRecord(payload);
    if (!record) continue;
    processCalendarPayload(record, items, effectiveToolName);
  }

  if (items.length === 0) return undefined;

  const unique = new Map<string, CalendarEventEntity>();
  for (const item of items) {
    unique.set(item.id, item);
  }

  const mergedItems = [...unique.values()];
  if (isCalendarCreateTool(effectiveToolName)) {
    for (const item of mergedItems) {
      item.created = true;
    }
  }

  return { type: "calendar_events", items: mergedItems };
}
