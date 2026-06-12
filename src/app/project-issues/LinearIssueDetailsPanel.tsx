import type { LinearIssueDetail } from "../../lib/api";
import {
  formatLinearEstimateLabel,
  formatLinearIssueDueDate,
} from "../../chat/linearIssue";
import { getPriorityLabel } from "../../chat/linearPriority";
import { LinearPriorityIcon } from "../../chat/LinearPriorityIcon";
import { LinearProjectIcon } from "../../chat/LinearProjectIcon";
import { LinearStatusIcon } from "../../chat/LinearStatusIcon";
import {
  buildLinearEstimateDropdownOptions,
  buildLinearPriorityDropdownOptions,
  isLinearNoEstimateValue,
  linearEstimateDropdownValue,
  linearPriorityDropdownValue,
} from "../../lib/linearIssueDetailDropdowns";
import { useMemo, type ReactNode } from "react";
import { searchableDropdownShortcut } from "../ui/searchableDropdownShortcuts";
import { SearchableDropdown, type SearchableDropdownOption } from "../ui/SearchableDropdown";
import {
  LinearIssueDetailsPropertyDropdown,
  LinearIssueEstimateIcon,
  LinearIssueNoEstimateIcon,
} from "./LinearIssueDetailsPropertyDropdown";

const LINEAR_STATUS_DROPDOWN_ORDER = [
  "backlog",
  "ready to start",
  "in progress",
  "on hold",
  "in review",
  "done",
  "canceled",
  "duplicated",
  "triage",
] as const;

const LINEAR_STATUS_DROPDOWN_ORDER_INDEX: Map<string, number> = new Map(
  LINEAR_STATUS_DROPDOWN_ORDER.map((status, index) => [status, index]),
);

function linearStatusDropdownSortKey(name: string): number {
  const normalized = name.trim().toLowerCase();
  if (normalized === "cancelled") return LINEAR_STATUS_DROPDOWN_ORDER_INDEX.get("canceled") ?? 0;
  if (normalized === "duplicate") return LINEAR_STATUS_DROPDOWN_ORDER_INDEX.get("duplicated") ?? 0;
  return LINEAR_STATUS_DROPDOWN_ORDER_INDEX.get(normalized) ?? Number.MAX_SAFE_INTEGER;
}

function LinearIssueDetailsSection({
  title,
  children,
  headerAction,
}: {
  title: string;
  children: ReactNode;
  headerAction?: ReactNode;
}) {
  return (
    <section className="linear-issue-details-section">
      <header className="linear-issue-details-section-header">
        <span className="linear-issue-details-section-heading">
          <span className="linear-issue-details-section-chevron" aria-hidden="true">
            ▾
          </span>
          <h3 className="linear-issue-details-section-title">{title}</h3>
        </span>
        {headerAction ? (
          <span className="linear-issue-details-section-action">{headerAction}</span>
        ) : null}
      </header>
      <div className="linear-issue-details-section-body">{children}</div>
    </section>
  );
}

function LinearIssueDetailsRow({
  icon,
  label,
  muted = false,
}: {
  icon: ReactNode;
  label: string;
  muted?: boolean;
}) {
  return (
    <div className="linear-issue-details-row">
      <span className="linear-issue-details-row-icon" aria-hidden="true">
        {icon}
      </span>
      <span
        className={[
          "linear-issue-details-row-label",
          muted ? "linear-issue-details-row-label-muted" : null,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {label}
      </span>
    </div>
  );
}

function AssigneeAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      <img
        className="linear-assignee-avatar linear-issue-details-assignee-avatar"
        src={avatarUrl}
        alt=""
      />
    );
  }

  return (
    <span className="linear-assignee-avatar linear-assignee-avatar-fallback linear-issue-details-assignee-avatar">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function LabelDot({ color }: { color: string }) {
  return (
    <span
      className="linear-issue-details-label-dot"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

export function LinearIssueDetailsPanel({
  issue,
  onStatusChange,
  onPriorityChange,
  onEstimateChange,
  onLabelAdd,
}: {
  issue: LinearIssueDetail;
  onStatusChange?: (stateId: string) => void;
  onPriorityChange?: (priority: string) => void;
  onEstimateChange?: (estimate: string) => void;
  onLabelAdd?: (labelId: string) => void;
}) {
  const priorityLabel = issue.priorityLabel || getPriorityLabel(issue.priority);
  const dueDateLabel = formatLinearIssueDueDate(issue.dueDate);
  const estimateLabel =
    issue.estimate == null || issue.estimate <= 0
      ? "No estimate"
      : formatLinearEstimateLabel(issue.estimate);

  const statusOptions = useMemo((): SearchableDropdownOption[] => {
    if (issue.workflowStates.length > 0) {
      return issue.workflowStates
        .map((state, originalIndex) => ({
          state,
          originalIndex,
          order: linearStatusDropdownSortKey(state.name),
        }))
        .sort((left, right) => {
          if (left.order !== right.order) return left.order - right.order;
          return left.originalIndex - right.originalIndex;
        })
        .map(({ state }, index) => ({
        value: state.id,
        label: state.name,
        icon: (
          <LinearStatusIcon status={state.name} stateType={state.type} title={state.name} />
        ),
        shortcut: searchableDropdownShortcut(index),
        searchTerms: state.type,
        }));
    }

    if (!issue.stateId) {
      return [];
    }

    return [
      {
        value: issue.stateId,
        label: issue.status,
        icon: (
          <LinearStatusIcon
            status={issue.status}
            stateType={issue.stateType}
            title={issue.status}
          />
        ),
        searchTerms: issue.stateType,
      },
    ];
  }, [issue.stateId, issue.stateType, issue.status, issue.workflowStates]);

  const priorityOptions = useMemo(
    (): SearchableDropdownOption[] =>
      buildLinearPriorityDropdownOptions().map((option) => ({
        ...option,
        icon: (
          <LinearPriorityIcon
            priority={Number(option.value)}
            title={option.label}
          />
        ),
      })),
    [],
  );

  const estimateOptions = useMemo(
    (): SearchableDropdownOption[] =>
      buildLinearEstimateDropdownOptions(issue.teamEstimation).map((option) => ({
        ...option,
        icon: isLinearNoEstimateValue(option.value) ? (
          <LinearIssueNoEstimateIcon />
        ) : (
          <LinearIssueEstimateIcon />
        ),
      })),
    [issue.teamEstimation],
  );

  const labelOptions = useMemo((): SearchableDropdownOption[] => {
    const selectedLabelIds = new Set(
      issue.labels
        .map((label) => label.id)
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0),
    );
    return issue.availableLabels
      .filter((label) => !selectedLabelIds.has(label.id))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((label) => ({
        value: label.id,
        label: label.name,
        icon: <LabelDot color={label.color} />,
        searchTerms: `${label.name} ${label.color}`,
      }));
  }, [issue.availableLabels, issue.labels]);

  const selectedStateId = issue.stateId ?? statusOptions[0]?.value ?? null;
  const selectedPriority = linearPriorityDropdownValue(issue.priority);
  const selectedEstimate = linearEstimateDropdownValue(issue.estimate, issue.teamEstimation);

  const estimateFallbackIcon = isLinearNoEstimateValue(selectedEstimate) ? (
    <LinearIssueNoEstimateIcon />
  ) : (
    <LinearIssueEstimateIcon />
  );

  const labelsHeaderAction = (
    <SearchableDropdown
      value={null}
      options={labelOptions}
      onChange={onLabelAdd}
      disabled={!onLabelAdd || labelOptions.length === 0}
      searchPlaceholder="Add label…"
      searchShortcutLabel="S"
      ariaLabel="Add label"
      className="linear-issue-details-label-add-dropdown"
      panelWidth={280}
      panelAlign="end"
      renderTrigger={({ open, disabled, triggerId, onToggle }) => (
        <button
          type="button"
          id={triggerId}
          className={[
            "linear-issue-details-label-add-button",
            open ? "linear-issue-details-label-add-button--open" : null,
          ]
            .filter(Boolean)
            .join(" ")}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Add label"
          onClick={onToggle}
        >
          <span aria-hidden="true">+</span>
        </button>
      )}
    />
  );

  return (
    <div className="linear-issue-details-panel">
      <LinearIssueDetailsSection title="Properties">
        <LinearIssueDetailsPropertyDropdown
          value={selectedStateId}
          options={statusOptions}
          onChange={onStatusChange}
          searchPlaceholder="Change status…"
          ariaLabel="Change status"
          fallbackIcon={
            <LinearStatusIcon
              status={issue.status}
              stateType={issue.stateType}
              title={issue.status}
            />
          }
          fallbackLabel={issue.status}
        />
        <LinearIssueDetailsPropertyDropdown
          value={selectedPriority}
          options={priorityOptions}
          onChange={onPriorityChange}
          searchPlaceholder="Change priority…"
          ariaLabel="Change priority"
          fallbackIcon={
            <LinearPriorityIcon priority={issue.priority} title={priorityLabel} />
          }
          fallbackLabel={priorityLabel}
        />
        {issue.assigneeUsername ? (
          <LinearIssueDetailsRow
            icon={
              <AssigneeAvatar
                name={issue.assigneeName ?? issue.assigneeUsername}
                avatarUrl={issue.assigneeAvatarUrl}
              />
            }
            label={issue.assigneeUsername}
          />
        ) : (
          <LinearIssueDetailsRow
            icon={<span className="linear-issue-details-empty-icon" />}
            label="Unassigned"
            muted
          />
        )}
        {estimateOptions.length > 0 ? (
          <LinearIssueDetailsPropertyDropdown
            value={selectedEstimate}
            options={estimateOptions}
            onChange={onEstimateChange}
            searchPlaceholder="Change estimate…"
            ariaLabel="Change estimate"
            fallbackIcon={estimateFallbackIcon}
            fallbackLabel={estimateLabel ?? "No estimate"}
          />
        ) : estimateLabel ? (
          <LinearIssueDetailsRow
            icon={estimateFallbackIcon}
            label={estimateLabel}
          />
        ) : null}
        {dueDateLabel ? (
          <LinearIssueDetailsRow
            icon={
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path
                  d="M11 1C13.209 1 15 2.791 15 5V11C15 13.209 13.209 15 11 15H5C2.791 15 1 13.209 1 11V5C1 2.791 2.791 1 5 1H11ZM13.5 6H2.5V11C2.5 12.381 3.619 13.5 5 13.5H11C12.381 13.5 13.5 12.381 13.5 11V6Z"
                  fill="#E15B59"
                />
              </svg>
            }
            label={dueDateLabel}
          />
        ) : null}
      </LinearIssueDetailsSection>

      <LinearIssueDetailsSection title="Labels" headerAction={labelsHeaderAction}>
        {issue.labels.length > 0 ? (
          <ul className="linear-issue-details-label-list">
            {issue.labels.map((label) => (
              <li key={label.id || label.name}>
                <span className="linear-issue-details-label">
                  <LabelDot color={label.color} />
                  {label.name}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="linear-issue-details-empty">No labels</p>
        )}
      </LinearIssueDetailsSection>

      {issue.projectName ? (
        <LinearIssueDetailsSection title="Project">
          <LinearIssueDetailsRow
            icon={<LinearProjectIcon title={issue.projectName} />}
            label={issue.projectName}
          />
        </LinearIssueDetailsSection>
      ) : null}
    </div>
  );
}
