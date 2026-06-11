import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadUserTimezone } from "./context/profile.ts";

export const DAILY_NOTE_FOLDER = "Daily";
export const DAY_LOG_HEADING = "## Day log";
export const DAY_LOG_DIVIDER = "---";
export const DAY_LOG_STUB = "- xx";

export function formatDateInTimezone(timezone: string, date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatTimezoneOffset(timeZone: string, date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(date);
  const raw = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  if (raw === "GMT") return "+00:00";

  const match = raw.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return "+00:00";

  const sign = match[1];
  const hours = match[2].padStart(2, "0");
  const minutes = match[3] ?? "00";
  return `${sign}${hours}:${minutes}`;
}

export function formatRFC3339InTimezone(
  dateIso: string,
  time: string,
  timeZone: string,
  reference = new Date(`${dateIso}T12:00:00.000Z`),
): string {
  return `${dateIso}T${time}${formatTimezoneOffset(timeZone, reference)}`;
}

export function formatWeekdayInTimezone(timezone: string, date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  }).format(date);
}

export function getDailyNoteRelativePath(dateIso: string): string {
  return `${DAILY_NOTE_FOLDER}/${dateIso}.md`;
}

export interface TodayDailyNoteInfo {
  timezone: string;
  date: string;
  weekday: string;
  path: string;
}

export function resolveTodayDailyNoteInfo(
  timezone = loadUserTimezone(),
  now = new Date(),
): TodayDailyNoteInfo {
  const date = formatDateInTimezone(timezone, now);
  return {
    timezone,
    date,
    weekday: formatWeekdayInTimezone(timezone, now),
    path: getDailyNoteRelativePath(date),
  };
}

export interface TodayDailyNoteResult extends TodayDailyNoteInfo {
  exists: boolean;
  created: boolean;
  content?: string;
}

export function defaultDailyNoteContent(date: string): string {
  return joinFrontmatterAndBody(
    `---\ndate: "${date}"\n---`,
    rebuildDayLogSection([], ""),
  );
}

function stripLegacyDateHeading(body: string): string {
  return body.replace(/^#\s+\d{4}-\d{2}-\d{2}\s*\n*/, "").trimStart();
}

function isDayLogStubLine(line: string): boolean {
  return line.trim() === DAY_LOG_STUB;
}

function normalizeDayLogStub(body: string): string {
  return body
    .split("\n")
    .filter((line) => line.trim() && !isDayLogStubLine(line))
    .join("\n");
}

function findDayLogBoundary(afterHeading: string): number {
  const legacyDividerIndex = afterHeading.search(/\n---\s*(?:\n|$)/);
  const nextSectionIndex = afterHeading.search(/\n##\s+/);
  const candidates = [legacyDividerIndex, nextSectionIndex].filter((index) => index >= 0);
  return candidates.length > 0 ? Math.min(...candidates) : -1;
}

function parseDayLogFromBody(body: string): { lines: string[]; trailing: string } | null {
  const headingIndex = body.indexOf(DAY_LOG_HEADING);
  if (headingIndex < 0) return null;

  const afterHeading = body.slice(headingIndex + DAY_LOG_HEADING.length);
  const boundaryIndex = findDayLogBoundary(afterHeading);
  const contentPart = boundaryIndex >= 0 ? afterHeading.slice(0, boundaryIndex) : afterHeading;
  let trailingPart = boundaryIndex >= 0 ? afterHeading.slice(boundaryIndex) : "";
  trailingPart = trailingPart.replace(/^\n---\s*\n?/, "\n").trimStart();

  const lines = contentPart
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(
      (line) =>
        line.length > 0 && !isDayLogStubLine(line) && line.trim() !== DAY_LOG_DIVIDER,
    );

  return { lines, trailing: trailingPart.trimEnd() };
}

function rebuildDayLogSection(lines: string[], trailing: string): string {
  const contentLines = lines.filter(
    (line) => line.trim() && !isDayLogStubLine(line) && line.trim() !== DAY_LOG_DIVIDER,
  );
  const section = [
    DAY_LOG_HEADING,
    ...(contentLines.length > 0 ? contentLines : [DAY_LOG_STUB]),
  ].join("\n");
  const trimmedTrailing = trailing.trim();
  return trimmedTrailing ? `${section}\n${trimmedTrailing}\n` : `${section}\n`;
}

export function splitFrontmatter(content: string): {
  frontmatter: string | null;
  body: string;
} {
  const normalized = content.startsWith("\ufeff") ? content.slice(1) : content;
  if (!normalized.startsWith("---")) {
    return { frontmatter: null, body: content };
  }

  const closeIndex = normalized.indexOf("\n---", 3);
  if (closeIndex < 0) {
    return { frontmatter: null, body: content };
  }

  const frontmatter = normalized.slice(0, closeIndex + 4);
  const bodyStart = closeIndex + 4;
  let body = normalized.slice(bodyStart);
  if (body.startsWith("\r\n")) {
    body = body.slice(2);
  } else if (body.startsWith("\n")) {
    body = body.slice(1);
  }

  return { frontmatter, body };
}

export function joinFrontmatterAndBody(frontmatter: string | null, body: string): string {
  const trimmedBody = body.trimEnd();
  if (!frontmatter) {
    return trimmedBody ? `${trimmedBody}\n` : "";
  }
  if (!trimmedBody) {
    return `${frontmatter}\n`;
  }
  return `${frontmatter}\n${trimmedBody}\n`;
}

function parseFrontmatterFields(frontmatter: string): Map<string, string> {
  const fields = new Map<string, string>();
  const lines = frontmatter.split("\n");
  const closeIndex = lines.lastIndexOf("---");

  for (const line of lines.slice(1, closeIndex)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) {
      fields.set(match[1], match[2]);
    }
  }

  return fields;
}

export interface DailyNoteStats {
  sleep: number | null;
  recovery: number | null;
  strain: number | null;
  productivity: number | null;
}

function parseFrontmatterNumber(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/"/g, "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function readDailyNoteStats(notesPath: string, date: string): DailyNoteStats | null {
  const absPath = join(notesPath, getDailyNoteRelativePath(date));
  if (!existsSync(absPath) || !statSync(absPath).isFile()) {
    return null;
  }

  const content = readFileSync(absPath, "utf8");
  const { frontmatter } = splitFrontmatter(content);
  if (!frontmatter) {
    return null;
  }

  const fields = parseFrontmatterFields(frontmatter);
  return {
    sleep: parseFrontmatterNumber(fields.get("sleep")),
    recovery: parseFrontmatterNumber(fields.get("recovery")),
    strain: parseFrontmatterNumber(fields.get("strain")),
    productivity: parseFrontmatterNumber(fields.get("productivity")),
  };
}

function renderFrontmatter(fields: Map<string, string>): string {
  const lines = ["---"];
  for (const [key, value] of fields.entries()) {
    lines.push(`${key}: ${value}`);
  }
  lines.push("---");
  return lines.join("\n");
}

export function upsertFrontmatterFields(
  content: string,
  fields: Record<string, string | number>,
  date: string,
): string {
  const { frontmatter, body } = splitFrontmatter(content);
  const parsed = parseFrontmatterFields(frontmatter ?? `---\ndate: "${date}"\n---`);

  if (!parsed.has("date")) {
    parsed.set("date", `"${date}"`);
  }

  for (const [key, value] of Object.entries(fields)) {
    if (value === "" || value == null) continue;
    parsed.set(key, typeof value === "number" ? String(value) : value);
  }

  const preferredOrder = ["date", "sleep", "recovery", "strain", "productivity", "gym"];
  const orderedKeys = [
    ...preferredOrder.filter((key) => parsed.has(key)),
    ...[...parsed.keys()].filter((key) => !preferredOrder.includes(key)),
  ];
  const orderedFields = new Map<string, string>();
  for (const key of orderedKeys) {
    const value = parsed.get(key);
    if (value != null) {
      orderedFields.set(key, value);
    }
  }

  return joinFrontmatterAndBody(renderFrontmatter(orderedFields), body);
}

export function ensureDailyNoteJournalStructure(content: string, date: string): string {
  const { frontmatter, body } = splitFrontmatter(content);
  let stripped = stripLegacyDateHeading(body.trimEnd());

  if (!stripped && !frontmatter) {
    return defaultDailyNoteContent(date);
  }

  if (!stripped.includes(DAY_LOG_HEADING)) {
    const legacyDividerIndex = stripped.indexOf(DAY_LOG_DIVIDER);
    const nextSectionIndex = stripped.indexOf("\n## ");
    let beforePart = stripped;
    let afterPart = "";

    if (
      legacyDividerIndex >= 0 &&
      (nextSectionIndex < 0 || legacyDividerIndex < nextSectionIndex)
    ) {
      beforePart = stripped.slice(0, legacyDividerIndex).trim();
      afterPart = stripped.slice(legacyDividerIndex + DAY_LOG_DIVIDER.length).trim();
    } else if (nextSectionIndex >= 0) {
      beforePart = stripped.slice(0, nextSectionIndex).trim();
      afterPart = stripped.slice(nextSectionIndex + 1).trimStart();
    }

    stripped = rebuildDayLogSection(
      beforePart ? beforePart.split("\n").filter((line) => line.trim()) : [],
      afterPart,
    );
  } else {
    const parsed = parseDayLogFromBody(stripped);
    stripped = rebuildDayLogSection(parsed?.lines ?? [], parsed?.trailing ?? "");
  }

  const resolvedFrontmatter =
    frontmatter ??
    `---\ndate: "${date}"\n---`;

  return joinFrontmatterAndBody(resolvedFrontmatter, stripped);
}

export function updateDayLogBody(
  content: string,
  mutate: (body: string) => string,
  date: string,
): string {
  const structured = ensureDailyNoteJournalStructure(content, date);
  const { frontmatter, body } = splitFrontmatter(structured);
  const parsed = parseDayLogFromBody(body);
  if (!parsed) {
    return structured;
  }

  const newBody = mutate(normalizeDayLogStub(parsed.lines.join("\n")));
  const nextLines = newBody
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  return joinFrontmatterAndBody(frontmatter, rebuildDayLogSection(nextLines, parsed.trailing));
}

export function upsertMetricInDayLog(
  content: string,
  metric: string,
  value: string,
  date: string,
): string {
  const line = `${metric}: ${value}`;
  const pattern = new RegExp(`^${metric}:\\s*.+$`, "m");

  return updateDayLogBody(content, (body) => {
    if (!body) return line;
    if (pattern.test(body)) return body.replace(pattern, line);
    return `${body}\n${line}`;
  }, date);
}

export function upsertMetricAfterInDayLog(
  content: string,
  metric: string,
  value: string,
  afterMetric: string,
  date: string,
): string {
  const line = `${metric}: ${value}`;
  const metricPattern = new RegExp(`^${metric}:\\s*.+$`, "m");
  const afterPattern = new RegExp(`^${afterMetric}:\\s*.+$`, "m");

  return updateDayLogBody(content, (body) => {
    if (metricPattern.test(body)) {
      return body.replace(metricPattern, line);
    }

    if (afterPattern.test(body)) {
      return body.replace(afterPattern, (match) => `${match}\n${line}`);
    }

    if (!body) return line;
    return `${body}\n${line}`;
  }, date);
}

export function upsertMetricBeforeInDayLog(
  content: string,
  metric: string,
  value: string,
  beforeMetric: string,
  date: string,
): string {
  const line = `${metric}: ${value}`;
  const metricPattern = new RegExp(`^${metric}:\\s*.+$`, "m");
  const beforePattern = new RegExp(`^${beforeMetric}:\\s*.+$`, "m");

  return updateDayLogBody(content, (body) => {
    if (metricPattern.test(body)) {
      return body.replace(metricPattern, line);
    }

    if (beforePattern.test(body)) {
      return body.replace(beforePattern, (match) => `${line}\n${match}`);
    }

    if (!body) return line;
    return `${body}\n${line}`;
  }, date);
}

export function appendDayLogLine(content: string, line: string, date: string): string {
  const trimmed = line.trim();
  if (!trimmed) return content;

  return updateDayLogBody(content, (body) => (body ? `${body}\n${trimmed}` : trimmed), date);
}

export function getTodayDailyNote(
  notesPath: string,
  options: {
    includeContent?: boolean;
    createIfMissing?: boolean;
    timezone?: string;
    now?: Date;
  } = {},
): TodayDailyNoteResult {
  const includeContent = options.includeContent ?? true;
  const createIfMissing = options.createIfMissing ?? false;
  const info = resolveTodayDailyNoteInfo(options.timezone, options.now);
  const absPath = join(notesPath, info.path);

  let exists = existsSync(absPath) && statSync(absPath).isFile();
  let created = false;

  if (!exists && createIfMissing) {
    mkdirSync(dirname(absPath), { recursive: true });
    writeFileSync(absPath, defaultDailyNoteContent(info.date), "utf8");
    exists = true;
    created = true;
  }

  const result: TodayDailyNoteResult = {
    ...info,
    exists,
    created,
  };

  if (includeContent && exists) {
    result.content = readFileSync(absPath, "utf8");
  }

  return result;
}

export function formatTodayDailyNoteResult(result: TodayDailyNoteResult): string {
  const lines = [
    `date: ${result.date}`,
    `weekday: ${result.weekday}`,
    `timezone: ${result.timezone}`,
    `path: ${result.path}`,
    `exists: ${result.exists}`,
  ];

  if (result.created) {
    lines.push("created: true");
  }

  if (result.content !== undefined) {
    lines.push("", "content:", result.content);
  }

  return lines.join("\n");
}

export function formatMetricValue(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function upsertMetricLine(content: string, metric: string, value: string): string {
  const line = `${metric}: ${value}`;
  const pattern = new RegExp(`^\\s*${metric}:\\s*.+$`, "im");

  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }

  const trimmed = content.trimEnd();
  if (!trimmed) {
    return `${line}\n`;
  }

  return `${trimmed}\n${line}\n`;
}

export function upsertEveningReflectionSection(
  content: string,
  reflectionMarkdown: string,
  date: string,
): string {
  const structured = ensureDailyNoteJournalStructure(content, date);
  const { frontmatter, body } = splitFrontmatter(structured);
  const parsed = parseDayLogFromBody(body);
  if (!parsed) {
    return structured;
  }

  const eveningHeading = "## Evening reflection";
  let trailing = parsed.trailing;
  const eveningIndex = trailing.indexOf(eveningHeading);
  if (eveningIndex >= 0) {
    trailing = trailing.slice(0, eveningIndex).trimEnd();
  }

  const normalizedReflection = reflectionMarkdown.trimEnd();
  const newTrailing = trailing
    ? `${trailing}\n${normalizedReflection}\n`
    : `${normalizedReflection}\n`;

  return joinFrontmatterAndBody(frontmatter, rebuildDayLogSection(parsed.lines, newTrailing));
}

export function updateTodayDailyNoteStrain(
  notesPath: string,
  strainScore: number,
  options: {
    timezone?: string;
    now?: Date;
    createIfMissing?: boolean;
  } = {},
): { path: string; updated: boolean; created: boolean; strainLine: string } {
  const createIfMissing = options.createIfMissing ?? true;
  const note = getTodayDailyNote(notesPath, {
    includeContent: true,
    createIfMissing,
    timezone: options.timezone,
    now: options.now,
  });

  if (!note.exists) {
    throw new Error(`Daily note not found at ${note.path}`);
  }

  const baseContent = note.content ?? defaultDailyNoteContent(note.date);
  let content = ensureDailyNoteJournalStructure(baseContent, note.date);
  const value = formatMetricValue(strainScore);
  content = upsertFrontmatterFields(content, { strain: value }, note.date);
  writeFileSync(join(notesPath, note.path), content, "utf8");

  return {
    path: note.path,
    updated: content !== baseContent,
    created: note.created,
    strainLine: `strain: ${value}`,
  };
}
