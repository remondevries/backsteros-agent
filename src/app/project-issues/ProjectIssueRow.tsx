import { LinearPriorityIcon } from "../../chat/LinearPriorityIcon";
import { getPriorityLabel } from "../../chat/linearPriority";
import type { LinearIssueEntity } from "../../chat/types";
import {
  formatIssueDueMetaLabel,
  linearIssueTitleForCardDisplay,
} from "../../lib/linearIssueDisplay";

function CalendarIcon() {
  return (
    <svg
      className="project-issue-row__pill-icon"
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

function EstimateIcon() {
  return (
    <svg
      className="project-issue-row__pill-icon"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
    >
      <path
        d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM7.25 4.5a.75.75 0 0 1 1.5 0v3.19l2.03 1.17a.75.75 0 1 1-.75 1.3L7.25 8.7V4.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ProjectIssueRow({
  issue,
  grouped = true,
  onClick,
}: {
  issue: LinearIssueEntity;
  grouped?: boolean;
  onClick: () => void;
}) {
  const labels = issue.labels ?? [];
  const primaryLabel = labels[0];
  const dueLabel = formatIssueDueMetaLabel(issue.dueDate);
  const hasEstimate = issue.estimate != null;
  const priorityLabel =
    issue.priorityLabel || getPriorityLabel(issue.priority);

  const rowClass = [
    "project-issue-row",
    grouped ? "project-issue-row--grouped" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const labelTitle =
    labels.length > 1 ? labels.map((label) => label.name).join(" · ") : primaryLabel?.name;

  return (
    <li className="workspace-status-list__item">
      <button type="button" className={rowClass} onClick={onClick}>
        <span className="project-issue-row__priority" title={priorityLabel}>
          <LinearPriorityIcon priority={issue.priority} title={priorityLabel} />
        </span>
        <span className="project-issue-row__id" title={issue.identifier}>
          {issue.identifier}
        </span>
        <span className="project-issue-row__title" title={issue.title}>
          {linearIssueTitleForCardDisplay(issue.title)}
        </span>
        {primaryLabel ? (
          <span className="project-issue-row__pill" title={labelTitle}>
            <span
              className="project-issue-row__pill-dot"
              style={{ backgroundColor: primaryLabel.color }}
              aria-hidden="true"
            />
            <span className="project-issue-row__pill-label">{primaryLabel.name}</span>
          </span>
        ) : null}
        {dueLabel ? (
          <span className="project-issue-row__pill project-issue-row__pill--due">
            <CalendarIcon />
            <span className="project-issue-row__pill-label">{dueLabel}</span>
          </span>
        ) : null}
        {!dueLabel && hasEstimate ? (
          <span className="project-issue-row__pill project-issue-row__pill--estimate">
            <EstimateIcon />
            <span className="project-issue-row__pill-label">{issue.estimate}</span>
          </span>
        ) : null}
      </button>
    </li>
  );
}
