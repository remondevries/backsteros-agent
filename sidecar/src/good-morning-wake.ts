import {
  applyGoodMorningWakeDailyNote,
  type DailyNoteWriteResult,
} from "./daily-note-automation.ts";
import { buildUpdateConfirmationToken } from "./update-confirmation.ts";
import { loadUserTimezone } from "./context/profile.ts";

export function formatWakeTimeDayLogValue(hours24: number, minutes: number): string {
  const period = hours24 >= 12 ? "PM" : "AM";
  const hour12 = hours24 % 12 || 12;
  return `around ${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function formatWakeFromParts(hours: number, minutes: number, period?: string): string | null {
  if (minutes < 0 || minutes > 59) return null;

  if (period) {
    if (hours < 1 || hours > 12) return null;
    const hours24 =
      period === "pm" ? (hours === 12 ? 12 : hours + 12) : hours === 12 ? 0 : hours;
    return formatWakeTimeDayLogValue(hours24, minutes);
  }

  if (hours < 0 || hours > 23) return null;
  return formatWakeTimeDayLogValue(hours, minutes);
}

export function parseWakeTimeFromAnswer(raw: string): string | null {
  let text = raw.trim().toLowerCase();
  if (!text) return null;

  text = text.replace(/^["']|["']$/g, "");
  text = text
    .replace(
      /^(i\s+)?(woke\s+(up\s+)?(at\s+)?|got\s+up\s+(at\s+)?|around\s+|at\s+|about\s+)/,
      "",
    )
    .trim();

  let match = text.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
  if (match) {
    return formatWakeFromParts(Number(match[1]), Number(match[2]), match[3]);
  }

  match = text.match(/^(\d{1,2})\s*(am|pm)$/);
  if (match) {
    return formatWakeFromParts(Number(match[1]), 0, match[2]);
  }

  match = text.match(/^(\d{3,4})$/);
  if (match) {
    const padded = match[1].padStart(4, "0");
    const hours = Number(padded.slice(0, -2));
    const minutes = Number(padded.slice(-2));
    if (hours <= 23 && minutes <= 59) {
      return formatWakeTimeDayLogValue(hours, minutes);
    }
  }

  return null;
}

export interface GoodMorningWakeFlowResult {
  wakeTime: string;
  dailyNoteUpdate: DailyNoteWriteResult;
  response: string;
}

export function buildGoodMorningWakeResponse(): string {
  return buildUpdateConfirmationToken("update", "daily note");
}

export function runGoodMorningWakeFlow(
  notesPath: string,
  wakeTimeAnswer: string,
  options: {
    timezone?: string;
    now?: Date;
  } = {},
): GoodMorningWakeFlowResult {
  const timezone = options.timezone ?? loadUserTimezone();
  const now = options.now ?? new Date();
  const wakeTime = parseWakeTimeFromAnswer(wakeTimeAnswer);

  if (!wakeTime) {
    throw new Error("Wake time is invalid");
  }

  const dailyNoteUpdate = applyGoodMorningWakeDailyNote(notesPath, wakeTime, {
    timezone,
    now,
  });

  return {
    wakeTime,
    dailyNoteUpdate,
    response: buildGoodMorningWakeResponse(),
  };
}
