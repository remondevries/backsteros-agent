/**
 * Linear `Document.icon` value for meeting notes (Calendar icon in the Linear UI).
 * Verified from document slug `testing-meeting-note-716be77441c5`.
 */
export const LINEAR_MEETING_DOCUMENT_ICON = "Calendar";

/** @deprecated Use LINEAR_MEETING_DOCUMENT_ICON */
export const LINEAR_CALENDAR_DOCUMENT_ICON = LINEAR_MEETING_DOCUMENT_ICON;

export function normalizeLinearDocumentIcon(icon: string | null | undefined): string {
  return icon?.trim() ?? "";
}

export function linearDocumentIconMatches(
  icon: string | null | undefined,
  targetIcon: string,
): boolean {
  return normalizeLinearDocumentIcon(icon) === targetIcon.trim();
}

export function isLinearMeetingDocumentIcon(icon: string | null | undefined): boolean {
  return linearDocumentIconMatches(icon, LINEAR_MEETING_DOCUMENT_ICON);
}

/** @deprecated Use isLinearMeetingDocumentIcon */
export const isLinearCalendarDocumentIcon = isLinearMeetingDocumentIcon;
