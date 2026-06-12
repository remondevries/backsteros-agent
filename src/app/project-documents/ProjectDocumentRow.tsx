import type { ProjectDocumentEntity } from "../../lib/documentStatusGroups";
import { formatIssueDueMetaLabel } from "../../lib/linearIssueDisplay";
import { DocumentNoteIcon } from "./DocumentNoteIcon";

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
  onClick,
}: {
  document: ProjectDocumentEntity;
  grouped?: boolean;
  onClick: () => void;
}) {
  const dateLabel = formatIssueDueMetaLabel(document.date);
  const rowClass = [
    "project-document-row",
    grouped ? "project-document-row--grouped" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li className="workspace-status-list__item">
      <button type="button" className={rowClass} onClick={onClick}>
        <span className="project-document-row__leading">
          <DocumentNoteIcon className="project-document-row__icon" />
        </span>
        <span className="project-document-row__organization" title={document.organization}>
          {document.organization || "—"}
        </span>
        <span className="project-document-row__title" title={document.title}>
          {document.title}
        </span>
        {document.category ? (
          <span className="project-document-row__pill" title={document.category}>
            <span className="project-document-row__pill-label">{document.category}</span>
          </span>
        ) : null}
        {document.owner ? (
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
