import { isoWeekKey } from "./dateFormat";
import { compareDocumentsNewestFirst, type ProjectDocumentEntity } from "./documentStatusGroups";
import {
  meetingDocumentDateFromTitle,
  parseMeetingDocumentTitle,
} from "./meetingDocumentTitle";

export const MEETING_WEEK_UNKNOWN_KEY = "unknown";

export type MeetingWeekGroup = {
  key: string;
  label: string;
  entries: ProjectDocumentEntity[];
};

export function resolveMeetingDocumentDateKey(
  document: ProjectDocumentEntity,
): string | null {
  const fromTitle = meetingDocumentDateFromTitle(document.title);
  if (fromTitle) return fromTitle;
  const fallback = (document.date ?? "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(fallback) ? fallback : null;
}

export function resolveMeetingDocumentWeekKey(document: ProjectDocumentEntity): string {
  const dateKey = resolveMeetingDocumentDateKey(document);
  if (!dateKey) return MEETING_WEEK_UNKNOWN_KEY;
  return isoWeekKey(dateKey);
}

/** Sidebar group title, e.g. `Week 1`, `Week 24`. */
export function formatMeetingWeekGroupLabel(weekKey: string): string {
  if (weekKey === MEETING_WEEK_UNKNOWN_KEY) return "No date";
  const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!match) return weekKey;
  return `Week ${Number(match[2])}`;
}

function compareMeetingsChronological(
  left: ProjectDocumentEntity,
  right: ProjectDocumentEntity,
): number {
  const leftDate = resolveMeetingDocumentDateKey(left) ?? "";
  const rightDate = resolveMeetingDocumentDateKey(right) ?? "";
  if (leftDate !== rightDate) return leftDate.localeCompare(rightDate);

  const leftTime = parseMeetingDocumentTitle(left.title).time ?? "";
  const rightTime = parseMeetingDocumentTitle(right.title).time ?? "";
  if (leftTime !== rightTime) return leftTime.localeCompare(rightTime);

  return compareDocumentsNewestFirst(left, right);
}

export function groupMeetingDocumentsByWeek(
  documents: ProjectDocumentEntity[],
): MeetingWeekGroup[] {
  const byKey = new Map<string, ProjectDocumentEntity[]>();

  for (const document of documents) {
    const weekKey = resolveMeetingDocumentWeekKey(document);
    const bucket = byKey.get(weekKey);
    if (bucket) {
      bucket.push(document);
    } else {
      byKey.set(weekKey, [document]);
    }
  }

  const keys = [...byKey.keys()].sort((left, right) => {
    if (left === MEETING_WEEK_UNKNOWN_KEY) return 1;
    if (right === MEETING_WEEK_UNKNOWN_KEY) return -1;
    return right.localeCompare(left);
  });

  return keys.map((key) => ({
    key,
    label: formatMeetingWeekGroupLabel(key),
    entries: [...(byKey.get(key) ?? [])].sort(compareMeetingsChronological),
  }));
}
