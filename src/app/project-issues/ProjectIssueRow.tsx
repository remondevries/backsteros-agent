import { useMemo, type MouseEvent } from "react";
import { DotScrollLoader } from "../../chat/DotScrollLoader";
import { LinearPriorityIcon } from "../../chat/LinearPriorityIcon";
import { getPriorityLabel } from "../../chat/linearPriority";
import type { LinearIssueEntity } from "../../chat/types";
import {
  formatIssueDueMetaLabel,
  linearIssueTitleForCardDisplay,
} from "../../lib/linearIssueDisplay";
import { resolveTerminalLeafId } from "../../modules/terminal/leafId";
import {
  useLeafAgentWaiting,
  useLeafAgentWorking,
  useLeafSessionActive,
} from "../../modules/terminal/lib/useTerminalSession";
import { LinearIssueEstimateIcon } from "./LinearIssueDetailsPropertyDropdown";

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

export function ProjectIssueRow({
  issue,
  grouped = true,
  dragging = false,
  onClick,
  onTerminalIndicatorClick,
  onPointerDragStart,
}: {
  issue: LinearIssueEntity;
  grouped?: boolean;
  dragging?: boolean;
  onClick: () => void;
  onTerminalIndicatorClick?: () => void;
  onPointerDragStart?: (issue: LinearIssueEntity, event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const terminalLeafId = useMemo(() => resolveTerminalLeafId(issue.id), [issue.id]);
  const terminalSessionActive = useLeafSessionActive(terminalLeafId);
  const terminalAgentWorking = useLeafAgentWorking(terminalLeafId);
  const terminalAgentWaiting = useLeafAgentWaiting(terminalLeafId);
  const labels = issue.labels ?? [];
  const primaryLabel = labels[0];
  const dueLabel = formatIssueDueMetaLabel(issue.dueDate);
  const hasEstimate = issue.estimate != null;
  const priorityLabel =
    issue.priorityLabel || getPriorityLabel(issue.priority);

  const rowClass = [
    "project-issue-row",
    grouped ? "project-issue-row--grouped" : null,
    dragging ? "project-issue-row--dragging" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const labelTitle =
    labels.length > 1 ? labels.map((label) => label.name).join(" · ") : primaryLabel?.name;
  const hasTerminalIndicator = terminalSessionActive;

  const isTerminalIndicatorTarget = (event: MouseEvent<HTMLButtonElement>): boolean => {
    const target = event.target as HTMLElement | null;
    return Boolean(target?.closest('[data-terminal-indicator="true"]'));
  };

  return (
    <li className="workspace-status-list__item">
      <button
        type="button"
        className={rowClass}
        draggable={false}
        onMouseDown={(event) => {
          if (hasTerminalIndicator && isTerminalIndicatorTarget(event)) {
            return;
          }
          onPointerDragStart?.(issue, event);
        }}
        onClick={(event) => {
          if (hasTerminalIndicator && isTerminalIndicatorTarget(event)) {
            onTerminalIndicatorClick?.();
            return;
          }
          onClick();
        }}
      >
        <span className="project-issue-row__priority" title={priorityLabel}>
          <LinearPriorityIcon priority={issue.priority} title={priorityLabel} />
        </span>
        <span className="project-issue-row__id" title={issue.identifier}>
          {issue.identifier}
        </span>
        <span className="project-issue-row__title" title={issue.title}>
          <span className="project-issue-row__title-text">
            {linearIssueTitleForCardDisplay(issue.title)}
          </span>
          {terminalSessionActive && terminalAgentWorking ? (
            <DotScrollLoader
              className="project-issue-row__agent-loader project-issue-row__terminal-indicator"
              aria-label="Agent working in terminal"
              data-terminal-indicator="true"
            />
          ) : null}
          {terminalSessionActive && terminalAgentWaiting ? (
            <DotScrollLoader
              className="project-issue-row__agent-loader project-issue-row__terminal-indicator"
              status="waiting"
              aria-label="Agent waiting in terminal"
              data-terminal-indicator="true"
            />
          ) : null}
          {terminalSessionActive && !terminalAgentWorking && !terminalAgentWaiting ? (
            <span
              className="linear-issue-terminal-session-dot project-issue-row__terminal-dot project-issue-row__terminal-indicator"
              aria-hidden="true"
              data-terminal-indicator="true"
            />
          ) : null}
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
            <span className="project-issue-row__pill-icon" aria-hidden="true">
              <LinearIssueEstimateIcon />
            </span>
            <span className="project-issue-row__pill-label">{issue.estimate}</span>
          </span>
        ) : null}
      </button>
    </li>
  );
}
