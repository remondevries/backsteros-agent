import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { MorningReviewWeather } from "./morning-review-weather.ts";
import { formatDailyCaptureLogEntry } from "./daily-capture.ts";
import { loadUserTimezone } from "./context/profile.ts";
import {
  defaultDailyNoteContent,
  ensureDailyNoteJournalStructure,
  formatDateInTimezone,
  formatMetricValue,
  getTodayDailyNote,
  appendDayLogLine,
  upsertEveningReflectionSection,
  upsertFrontmatterFields,
  upsertMetricAfterInDayLog,
  upsertMetricInDayLog,
} from "./daily-note.ts";
import type { WhoopSnapshotEntity } from "./types.ts";

export function formatLocalTimeLabel(timezone: string, date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function dayUtcBoundsForTimezone(
  timezone: string,
  now = new Date(),
): { startIso: string; endIso: string; date: string } {
  const date = formatDateInTimezone(timezone, now);
  const [year, month, day] = date.split("-").map(Number);
  const utcMidnightGuess = Date.UTC(year, month - 1, day, 0, 0, 0);
  const offsetMs = getTimezoneOffsetMs(timezone, new Date(utcMidnightGuess));
  const startMs = utcMidnightGuess - offsetMs;
  return {
    date,
    startIso: new Date(startMs).toISOString(),
    endIso: new Date(startMs + 86_400_000).toISOString(),
  };
}

function getTimezoneOffsetMs(timezone: string, date: Date): number {
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const local = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
  return local.getTime() - utc.getTime();
}

function formatDurationMs(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  if (minutes <= 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatSleptDuration(whoop: WhoopSnapshotEntity | null | undefined): string {
  if (whoop?.sleepDuration) {
    return whoop.sleepDuration;
  }

  if (whoop?.sleepStartedAt && whoop?.sleepEndedAt) {
    const ms =
      new Date(whoop.sleepEndedAt).getTime() - new Date(whoop.sleepStartedAt).getTime();
    if (ms > 0) {
      return formatDurationMs(ms);
    }
  }

  return "unknown";
}

export function formatBedtimeFromWhoop(
  whoop: WhoopSnapshotEntity | null | undefined,
  timezone: string,
): string | null {
  if (!whoop?.sleepStartedAt) return null;

  const startedAt = new Date(whoop.sleepStartedAt);
  if (Number.isNaN(startedAt.getTime())) return null;

  return `around ${formatLocalTimeLabel(timezone, startedAt)}`;
}

export function formatWeatherMetric(weather: MorningReviewWeather): string {
  const temp = weather.temperatureC != null ? `${weather.temperatureC}°C` : null;
  if (temp) {
    return `${weather.description}, ${temp} in ${weather.locationLabel}`;
  }
  return `${weather.description} in ${weather.locationLabel}`;
}

export function formatSleepFrontmatterValue(
  whoop: WhoopSnapshotEntity | null | undefined,
): number | null {
  if (whoop?.sleepPerformance == null || Number.isNaN(whoop.sleepPerformance)) {
    return null;
  }
  return Math.round(whoop.sleepPerformance);
}

export function formatRecoveryFrontmatterValue(
  whoop: WhoopSnapshotEntity | null | undefined,
): number | null {
  if (whoop?.recoveryScore == null || Number.isNaN(whoop.recoveryScore)) {
    return null;
  }
  return Math.round(whoop.recoveryScore);
}

export function formatStrainFrontmatterValue(
  whoop: WhoopSnapshotEntity | null | undefined,
): string | null {
  if (whoop?.strainScore == null || Number.isNaN(whoop.strainScore)) {
    return null;
  }
  return formatMetricValue(whoop.strainScore);
}

export function formatGoodMorningFrontmatterFields(
  whoop: WhoopSnapshotEntity | null | undefined,
): Record<string, string | number> {
  const fields: Record<string, string | number> = {};
  const sleep = formatSleepFrontmatterValue(whoop);
  const recovery = formatRecoveryFrontmatterValue(whoop);

  if (sleep != null) fields.sleep = sleep;
  if (recovery != null) fields.recovery = recovery;

  return fields;
}

export function formatWhoopFrontmatterFields(
  whoop: WhoopSnapshotEntity | null | undefined,
): Record<string, string | number> {
  const fields: Record<string, string | number> = {};
  const sleep = formatSleepFrontmatterValue(whoop);
  const recovery = formatRecoveryFrontmatterValue(whoop);
  const strain = formatStrainFrontmatterValue(whoop);

  if (sleep != null) fields.sleep = sleep;
  if (recovery != null) fields.recovery = recovery;
  if (strain != null) fields.strain = strain;

  return fields;
}

export function computeProductivityScore(completedCount: number): number {
  if (completedCount > 15) return 10;
  if (completedCount > 10) return 9;
  if (completedCount > 5) return 5;
  return completedCount;
}

export interface DailyNoteWriteResult {
  path: string;
  updated: boolean;
  created: boolean;
  lines: string[];
}

export function updateTodayDailyNoteMetrics(
  notesPath: string,
  metrics: Record<string, string>,
  options: {
    timezone?: string;
    now?: Date;
    createIfMissing?: boolean;
  } = {},
): DailyNoteWriteResult {
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

  let content = note.content ?? defaultDailyNoteContent(note.date);
  const baseContent = content;
  content = ensureDailyNoteJournalStructure(content, note.date);
  const lines: string[] = [];

  for (const [metric, value] of Object.entries(metrics)) {
    content = upsertMetricInDayLog(content, metric, value, note.date);
    lines.push(`${metric}: ${value}`);
  }

  writeFileSync(join(notesPath, note.path), content, "utf8");

  return {
    path: note.path,
    updated: content !== baseContent,
    created: note.created,
    lines,
  };
}

export function applyMorningReviewDailyNote(
  notesPath: string,
  input: {
    whoop: WhoopSnapshotEntity | null;
    weather: MorningReviewWeather | null;
    timezone: string;
    now?: Date;
  },
): DailyNoteWriteResult {
  const now = input.now ?? new Date();
  const note = getTodayDailyNote(notesPath, {
    includeContent: true,
    createIfMissing: true,
    timezone: input.timezone,
    now,
  });

  if (!note.exists) {
    throw new Error(`Daily note not found at ${note.path}`);
  }

  let content = note.content ?? defaultDailyNoteContent(note.date);
  const baseContent = content;
  const lines: string[] = [];

  const whoopFrontmatter = formatGoodMorningFrontmatterFields(input.whoop);
  if (Object.keys(whoopFrontmatter).length > 0) {
    content = upsertFrontmatterFields(content, whoopFrontmatter, note.date);
    for (const [metric, value] of Object.entries(whoopFrontmatter)) {
      lines.push(`${metric}: ${value}`);
    }
  }

  content = ensureDailyNoteJournalStructure(content, note.date);

  // Insertion order defines how the metrics appear in the markdown day log.
  // We write `bedtime` first to reflect the previous night's sleep window.
  const dayLogMetrics: Record<string, string> = {};

  const bedtime = formatBedtimeFromWhoop(input.whoop, input.timezone);
  if (bedtime) {
    dayLogMetrics.bedtime = bedtime;
  }

  dayLogMetrics.woke = `around ${formatLocalTimeLabel(input.timezone, now)}`;
  dayLogMetrics.slept = formatSleptDuration(input.whoop);

  if (input.weather) {
    dayLogMetrics.weather = formatWeatherMetric(input.weather);
  }

  for (const [metric, value] of Object.entries(dayLogMetrics)) {
    content = upsertMetricInDayLog(content, metric, value, note.date);
    lines.push(`${metric}: ${value}`);
  }

  writeFileSync(join(notesPath, note.path), content, "utf8");

  return {
    path: note.path,
    updated: content !== baseContent,
    created: note.created,
    lines,
  };
}

export function applyGoodMorningFeelDailyNote(
  notesPath: string,
  feelText: string,
  options: {
    timezone?: string;
    now?: Date;
    createIfMissing?: boolean;
  } = {},
): DailyNoteWriteResult {
  const createIfMissing = options.createIfMissing ?? true;
  const trimmedFeel = feelText.trim();
  if (!trimmedFeel || trimmedFeel === "." || !/[a-zA-Z]/.test(trimmedFeel)) {
    throw new Error("Feel line is empty");
  }

  const note = getTodayDailyNote(notesPath, {
    includeContent: true,
    createIfMissing,
    timezone: options.timezone,
    now: options.now,
  });

  if (!note.exists) {
    throw new Error(`Daily note not found at ${note.path}`);
  }

  let content = note.content ?? defaultDailyNoteContent(note.date);
  const baseContent = content;
  content = ensureDailyNoteJournalStructure(content, note.date);
  content = upsertMetricAfterInDayLog(content, "feel", trimmedFeel, "slept", note.date);

  writeFileSync(join(notesPath, note.path), content, "utf8");

  return {
    path: note.path,
    updated: content !== baseContent,
    created: note.created,
    lines: [`feel: ${trimmedFeel}`],
  };
}

export function applyGoodNightDailyNote(
  notesPath: string,
  input: {
    whoop: WhoopSnapshotEntity | null;
    completedIssueCount: number;
    timezone: string;
    now?: Date;
  },
): DailyNoteWriteResult {
  const now = input.now ?? new Date();
  const note = getTodayDailyNote(notesPath, {
    includeContent: true,
    createIfMissing: true,
    timezone: input.timezone,
    now,
  });

  if (!note.exists) {
    throw new Error(`Daily note not found at ${note.path}`);
  }

  let content = note.content ?? defaultDailyNoteContent(note.date);
  const baseContent = content;
  const lines: string[] = [];

  const frontmatterFields: Record<string, string | number> = {
    productivity: computeProductivityScore(input.completedIssueCount),
  };
  const strain = formatStrainFrontmatterValue(input.whoop);
  const recovery = formatRecoveryFrontmatterValue(input.whoop);
  if (strain != null) {
    frontmatterFields.strain = strain;
  }
  if (recovery != null) {
    frontmatterFields.recovery = recovery;
  }

  content = upsertFrontmatterFields(content, frontmatterFields, note.date);
  for (const [metric, value] of Object.entries(frontmatterFields)) {
    lines.push(`${metric}: ${value}`);
  }

  content = ensureDailyNoteJournalStructure(content, note.date);
  content = upsertMetricInDayLog(
    content,
    "bedtime",
    `around ${formatLocalTimeLabel(input.timezone, now)}`,
    note.date,
  );
  lines.push(`bedtime: around ${formatLocalTimeLabel(input.timezone, now)}`);

  writeFileSync(join(notesPath, note.path), content, "utf8");

  return {
    path: note.path,
    updated: content !== baseContent,
    created: note.created,
    lines,
  };
}

export function applyGoodNightReflectionDailyNote(
  notesPath: string,
  reflectionMarkdown: string,
  options: {
    timezone?: string;
    now?: Date;
    createIfMissing?: boolean;
  } = {},
): DailyNoteWriteResult {
  const createIfMissing = options.createIfMissing ?? true;
  const trimmed = reflectionMarkdown.trim();
  if (!trimmed.includes("## Evening reflection")) {
    throw new Error("Evening reflection markdown is invalid");
  }

  const note = getTodayDailyNote(notesPath, {
    includeContent: true,
    createIfMissing,
    timezone: options.timezone,
    now: options.now,
  });

  if (!note.exists) {
    throw new Error(`Daily note not found at ${note.path}`);
  }

  let content = note.content ?? defaultDailyNoteContent(note.date);
  const baseContent = content;
  content = upsertEveningReflectionSection(content, trimmed, note.date);

  writeFileSync(join(notesPath, note.path), content, "utf8");

  return {
    path: note.path,
    updated: content !== baseContent,
    created: note.created,
    lines: ["## Evening reflection"],
  };
}

export function applyDailyCaptureDailyNote(
  notesPath: string,
  text: string,
  options: {
    timezone?: string;
    now?: Date;
    logTime?: string;
  } = {},
): DailyNoteWriteResult {
  const timezone = options.timezone ?? loadUserTimezone();
  const now = options.now ?? new Date();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Daily capture message is empty");
  }

  const note = getTodayDailyNote(notesPath, {
    includeContent: true,
    createIfMissing: true,
    timezone,
    now,
  });

  if (!note.exists) {
    throw new Error(`Daily note not found at ${note.path}`);
  }

  let content = note.content ?? defaultDailyNoteContent(note.date);
  const baseContent = content;
  content = ensureDailyNoteJournalStructure(content, note.date);
  const line = formatDailyCaptureLogEntry(trimmed, timezone, { now, logTime: options.logTime });
  content = appendDayLogLine(content, line, note.date);

  writeFileSync(join(notesPath, note.path), content, "utf8");

  return {
    path: note.path,
    updated: content !== baseContent,
    created: note.created,
    lines: [line],
  };
}
