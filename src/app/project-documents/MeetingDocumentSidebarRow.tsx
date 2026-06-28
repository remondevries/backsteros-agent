import type { ProjectDocumentEntity } from "../../lib/documentStatusGroups";
import {
  contentListItemDataAttributes,
} from "../../lib/contentListNavigation";
import {
  useContentListItemKeyboardFocused,
} from "../../lib/contentListNavigationReact";
import {
  meetingDocumentDisplayTitle,
  parseMeetingDocumentTitle,
} from "../../lib/meetingDocumentTitle";
import { MeetingDocumentCalendarDate } from "./MeetingDocumentCalendarDate";

export function meetingDocumentSidebarRowParts(document: ProjectDocumentEntity) {
  const parsed = parseMeetingDocumentTitle(document.title);
  return {
    displayTitle: meetingDocumentDisplayTitle(document.title),
    date: parsed.date ?? document.date,
    time: parsed.time,
    organizationLabel:
      document.organization?.trim() || document.projectName?.trim() || "No organization",
  };
}

export function MeetingDocumentSidebarRow({
  document,
  selected = false,
  onClick,
}: {
  document: ProjectDocumentEntity;
  selected?: boolean;
  onClick: () => void;
}) {
  const { displayTitle, date, time, organizationLabel } =
    meetingDocumentSidebarRowParts(document);
  const keyboardFocused = useContentListItemKeyboardFocused(document.linearDocumentId);
  const rowClass = [
    "meeting-document-sidebar-row",
    selected ? "meeting-document-sidebar-row--selected" : null,
    keyboardFocused ? "meeting-document-sidebar-row--keyboard-focused" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li className="workspace-status-list__item">
      <button
        type="button"
        {...contentListItemDataAttributes(document.linearDocumentId)}
        className={rowClass}
        onClick={onClick}
      >
        <MeetingDocumentCalendarDate date={date} time={time} />
        <span className="meeting-document-sidebar-row__text">
          <span
            className="meeting-document-sidebar-row__organization"
            title={organizationLabel}
          >
            {organizationLabel}
          </span>
          <span className="meeting-document-sidebar-row__title" title={displayTitle}>
            {displayTitle}
          </span>
        </span>
      </button>
    </li>
  );
}
