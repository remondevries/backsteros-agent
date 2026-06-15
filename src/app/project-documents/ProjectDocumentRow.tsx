import type { ProjectDocumentEntity } from "../../lib/documentStatusGroups";
import { isLinearMeetingDocumentIcon } from "../../lib/linearDocumentIcons";
import { linearLinkedDocumentDisplayTitle } from "../../lib/linearLinkedDocumentTitle";
import { meetingDocumentDisplayTitle } from "../../lib/meetingDocumentTitle";
import { contentListItemDataAttributes } from "../../lib/contentListNavigation";
import {
  useContentListItemKeyboardFocused,
} from "../../lib/contentListNavigationReact";
import { formatIssueDueMetaLabel } from "../../lib/linearIssueDisplay";
import { LinearTeamIcon } from "../SidebarNavIcons";
import {
  LinearDocumentNoteIcon,
  type LinearDocumentNoteIconFallback,
} from "./LinearDocumentNoteIcon";

function CalendarIcon() {
  return (
    <svg
      className="project-document-row__pill-icon"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path
        d="M5 1.5a.5.5 0 0 1 1 0V2h4v-.5a.5.5 0 0 1 1 0V2h1.5A1.5 1.5 0 0 1 14 3.5v9A1.5 1.5 0 0 1 12.5 14h-9A1.5 1.5 0 0 1 2 12.5v-9A1.5 1.5 0 0 1 3.5 2H5v-.5ZM3.5 6v6.5h9V6h-9Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ProjectDocumentRow({
  document,
  grouped = true,
  showMeta = true,
  showOrganization = false,
  iconFallback = "document",
  onClick,
}: {
  document: ProjectDocumentEntity;
  grouped?: boolean;
  showMeta?: boolean;
  showOrganization?: boolean;
  iconFallback?: LinearDocumentNoteIconFallback;
  onClick: () => void;
}) {
  const dateLabel = showMeta ? formatIssueDueMetaLabel(document.date) : null;
  const organizationLabel = document.organization?.trim() || null;
  const rowTitle = isLinearMeetingDocumentIcon(document.icon)
    ? meetingDocumentDisplayTitle(document.title)
    : linearLinkedDocumentDisplayTitle(document.title);
  const showCategory =
    showMeta &&
    Boolean(document.category) &&
    document.category.trim().toLowerCase() !== "document";
  const keyboardFocused = useContentListItemKeyboardFocused(document.linearDocumentId);
  const rowClass = [
    "project-document-row",
    grouped ? "project-document-row--grouped" : null,
    keyboardFocused ? "project-document-row--keyboard-focused" : null,
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
        <span className="project-document-row__leading">
          <LinearDocumentNoteIcon
            icon={document.icon}
            className="project-document-row__icon"
            fallback={iconFallback}
          />
        </span>
        <span className="project-document-row__title" title={rowTitle}>
          {rowTitle}
        </span>
        {showOrganization && organizationLabel ? (
          <span className="project-document-row__pill" title={organizationLabel}>
            <LinearTeamIcon className="project-document-row__pill-icon" />
            <span className="project-document-row__pill-label">{organizationLabel}</span>
          </span>
        ) : null}
        {showCategory ? (
          <span className="project-document-row__pill" title={document.category}>
            <span className="project-document-row__pill-label">{document.category}</span>
          </span>
        ) : null}
        {showMeta && document.owner ? (
          <span className="project-document-row__pill" title={document.owner}>
            <span className="project-document-row__pill-label">{document.owner}</span>
          </span>
        ) : null}
        {dateLabel ? (
          <span className="project-document-row__pill project-document-row__pill--date">
            <CalendarIcon />
            <span className="project-document-row__pill-label">{dateLabel}</span>
          </span>
        ) : null}
      </button>
    </li>
  );
}
