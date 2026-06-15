const MEETING_DOCUMENT_TITLE_PATTERN =
  /^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?\s*-\s*(.*)$/;

export function parseMeetingDocumentTitle(title: string | null | undefined): {
  date: string | null;
  time: string | null;
  displayTitle: string;
} {
  if (!title) {
    return { date: null, time: null, displayTitle: "" };
  }

  const trimmed = title.trim();
  const match = MEETING_DOCUMENT_TITLE_PATTERN.exec(trimmed);
  if (!match) {
    return { date: null, time: null, displayTitle: trimmed };
  }

  return {
    date: match[1] ?? null,
    time: match[2] ?? null,
    displayTitle: (match[3] ?? "").trim(),
  };
}

export function meetingDocumentDateFromTitle(title: string | null | undefined): string | null {
  return parseMeetingDocumentTitle(title).date;
}
