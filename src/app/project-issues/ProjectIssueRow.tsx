import { useMemo, type MouseEvent } from "react";
import { DotScrollLoader } from "../../chat/DotScrollLoader";
import type { LinearWorkflowStateForIcon } from "../../lib/linearStatusIcon";
import { LinearStatusIcon } from "../../chat/LinearStatusIcon";
import { LinearPriorityIcon } from "../../chat/LinearPriorityIcon";
import { getPriorityLabel } from "../../chat/linearPriority";
import type { LinearIssueEntity } from "../../chat/types";
import { contentListItemDataAttributes } from "../../lib/contentListNavigation";
import {
  useContentListItemKeyboardFocused,
} from "../../lib/contentListNavigationReact";
import {
  formatIssueDueMetaLabel,
  linearIssueTitleForCardDisplay,
} from "../../lib/linearIssueDisplay";
import { abbreviateGithubLabelName, githubLabelHoverTitle } from "../../lib/linearLabelDisplay";
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
  selected = false,
  leadingIcon = "priority",
  leadingStatusOverride,
  showMeta = true,
  showPrimaryLabel = true,
  showProjectLabel = false,
  showIdentifier = true,
  showDueMeta = true,
  showEstimateMeta = true,
  onClick,
  onTerminalIndicatorClick,
  onPointerDragStart,
  workflowStates,
}: {
  issue: LinearIssueEntity;
  grouped?: boolean;
  dragging?: boolean;
  selected?: boolean;
  leadingIcon?: "priority" | "status";
  leadingStatusOverride?: "triage";
  showMeta?: boolean;
  showPrimaryLabel?: boolean;
  showProjectLabel?: boolean;
  showIdentifier?: boolean;
  showDueMeta?: boolean;
  showEstimateMeta?: boolean;
  workflowStates?: LinearWorkflowStateForIcon[];
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
  const dueLabel = showMeta && showDueMeta ? formatIssueDueMetaLabel(issue.dueDate) : null;
  const hasEstimate = issue.estimate != null;
  const priorityLabel =
    issue.priorityLabel || getPriorityLabel(issue.priority);
  const leadingTitle =
    leadingStatusOverride === "triage"
      ? "Triage"
      : leadingIcon === "status"
        ? (issue.status?.trim() || "Unknown")
        : priorityLabel;
  const keyboardFocused = useContentListItemKeyboardFocused(issue.id);

  const rowClass = [
    "project-issue-row",
    grouped ? "project-issue-row--grouped" : null,
    dragging ? "project-issue-row--dragging" : null,
    selected ? "project-issue-row--selected" : null,
    keyboardFocused ? "project-issue-row--keyboard-focused" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const labelTitle =
    labels.length > 1
      ? labels.map((label) => label.name).join(" · ")
      : primaryLabel
        ? githubLabelHoverTitle(primaryLabel.name)
        : undefined;
  const primaryLabelDisplay = primaryLabel
    ? abbreviateGithubLabelName(primaryLabel.name)
    : null;
  const projectLabelDisplay = issue.projectName
    ? abbreviateGithubLabelName(issue.projectName)
    : null;
  const hasTerminalIndicator = terminalSessionActive;

  const isTerminalIndicatorTarget = (event: MouseEvent<HTMLButtonElement>): boolean => {
    const target = event.target as HTMLElement | null;
    return Boolean(target?.closest('[data-terminal-indicator="true"]'));
  };

  return (
    <li className="workspace-status-list__item">
      <button
        type="button"
        {...contentListItemDataAttributes(issue.id)}
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
        {showMeta ? (
          <span className="project-issue-row__leading" title={leadingTitle}>
            {leadingIcon === "status" ? (
              <LinearStatusIcon
                status={leadingStatusOverride === "triage" ? "Triage" : issue.status}
                stateType={leadingStatusOverride === "triage" ? "triage" : issue.stateType}
                stateId={leadingStatusOverride === "triage" ? undefined : issue.stateId}
                statusColor={leadingStatusOverride === "triage" ? undefined : issue.statusColor}
                workflowStates={workflowStates}
                title={leadingTitle}
              />
            ) : (
              <LinearPriorityIcon priority={issue.priority} title={priorityLabel} />
            )}
          </span>
        ) : null}
        {showMeta && showIdentifier && issue.identifier ? (
          <span className="project-issue-row__id" title={issue.identifier}>
            {issue.identifier}
          </span>
        ) : null}
        <span className="project-issue-row__title" title={issue.title}>
          <span className="project-issue-row__title-text">
            {linearIssueTitleForCardDisplay(issue.title)}
          </span>
          {showMeta && terminalSessionActive && terminalAgentWorking ? (
            <DotScrollLoader
              className="project-issue-row__agent-loader project-issue-row__terminal-indicator"
              aria-label="Agent working in terminal"
              data-terminal-indicator="true"
            />
          ) : null}
          {showMeta && terminalSessionActive && terminalAgentWaiting ? (
            <DotScrollLoader
              className="project-issue-row__agent-loader project-issue-row__terminal-indicator"
              status="waiting"
              aria-label="Agent waiting in terminal"
              data-terminal-indicator="true"
            />
          ) : null}
          {showMeta && terminalSessionActive && !terminalAgentWorking && !terminalAgentWaiting ? (
            <span
              className="linear-issue-terminal-session-dot project-issue-row__terminal-dot project-issue-row__terminal-indicator"
              aria-hidden="true"
              data-terminal-indicator="true"
            />
          ) : null}
        </span>
        {showMeta && showPrimaryLabel && primaryLabel ? (
          <span className="project-issue-row__pill" title={labelTitle}>
            <span
              className="project-issue-row__pill-dot"
              style={{ backgroundColor: primaryLabel.color }}
              aria-hidden="true"
            />
            <span className="project-issue-row__pill-label">{primaryLabelDisplay}</span>
          </span>
        ) : null}
        {showMeta && showProjectLabel && issue.projectName ? (
          <span
            className="project-issue-row__pill project-issue-row__pill--project"
            title={githubLabelHoverTitle(issue.projectName)}
          >
            <span className="project-issue-row__pill-label">{projectLabelDisplay}</span>
          </span>
        ) : null}
        {dueLabel ? (
          <span className="project-issue-row__pill project-issue-row__pill--due">
            <CalendarIcon />
            <span className="project-issue-row__pill-label">{dueLabel}</span>
          </span>
        ) : null}
        {showMeta && showEstimateMeta && !dueLabel && hasEstimate ? (
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
