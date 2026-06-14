import type { LinearIssueDetail } from "../../lib/api";
import {
  formatLinearEstimateLabel,
} from "../../chat/linearIssue";
import { getPriorityLabel } from "../../chat/linearPriority";
import { LinearPriorityIcon } from "../../chat/LinearPriorityIcon";
import { LinearProjectIcon } from "../../chat/LinearProjectIcon";
import { LinearStatusIcon } from "../../chat/LinearStatusIcon";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { registerLinearIssuePropertyShortcuts } from "../../lib/linearIssuePropertyShortcuts";
import {
  buildLinearAssigneeDropdownOptions,
  buildLinearEstimateDropdownOptions,
  buildLinearPriorityDropdownOptions,
  isLinearNoEstimateValue,
  LINEAR_UNASSIGNED_ASSIGNEE_VALUE,
  linearAssigneeDropdownValue,
  linearEstimateDropdownValue,
  linearPriorityDropdownValue,
} from "../../lib/linearIssueDetailDropdowns";
import { abbreviateGithubLabelName, githubLabelHoverTitle } from "../../lib/linearLabelDisplay";
import { searchableDropdownShortcut } from "../ui/searchableDropdownShortcuts";
import { SearchableDropdown, type SearchableDropdownOption } from "../ui/SearchableDropdown";
import {
  LinearIssueDetailsPropertyDropdown,
  LinearIssueDueDatePropertyDropdown,
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
  title,
  muted = false,
}: {
  icon: ReactNode;
  label: string;
  title?: string;
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
        title={title}
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
  onAssigneeChange,
  onEstimateChange,
  onDueDateChange,
  onLabelAdd,
}: {
  issue: LinearIssueDetail;
  onStatusChange?: (stateId: string) => void;
  onPriorityChange?: (priority: string) => void;
  onAssigneeChange?: (assigneeId: string) => void;
  onEstimateChange?: (estimate: string) => void;
  onDueDateChange?: (dueDate: string | null) => void;
  onLabelAdd?: (labelId: string) => void;
}) {
  const openStatusRef = useRef<(() => void) | null>(null);
  const openPriorityRef = useRef<(() => void) | null>(null);
  const openAssigneeRef = useRef<(() => void) | null>(null);
  const openEstimateRef = useRef<(() => void) | null>(null);
  const openLabelsRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return registerLinearIssuePropertyShortcuts({
      openStatus: () => {
        if (!openStatusRef.current) return false;
        openStatusRef.current();
        return true;
      },
      openPriority: () => {
        if (!openPriorityRef.current) return false;
        openPriorityRef.current();
        return true;
      },
      openAssignee: () => {
        if (!openAssigneeRef.current) return false;
        openAssigneeRef.current();
        return true;
      },
      openEstimate: () => {
        if (!openEstimateRef.current) return false;
        openEstimateRef.current();
        return true;
      },
      openLabels: () => {
        if (!openLabelsRef.current) return false;
        openLabelsRef.current();
        return true;
      },
    });
  }, []);

  const priorityLabel = issue.priorityLabel || getPriorityLabel(issue.priority);
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

  const assigneeOptions = useMemo((): SearchableDropdownOption[] => {
    return buildLinearAssigneeDropdownOptions(issue.teamMembers).map((option) => {
      if (option.value === LINEAR_UNASSIGNED_ASSIGNEE_VALUE) {
        return {
          ...option,
          icon: <span className="linear-issue-details-empty-icon" />,
        };
      }

      const member = issue.teamMembers.find((entry) => entry.id === option.value);
      return {
        ...option,
        icon: member ? (
          <AssigneeAvatar name={member.name} avatarUrl={member.avatarUrl} />
        ) : (
          <span className="linear-issue-details-empty-icon" />
        ),
      };
    });
  }, [issue.teamMembers]);

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
  const selectedAssignee = linearAssigneeDropdownValue(issue.assigneeId);
  const selectedEstimate = linearEstimateDropdownValue(issue.estimate, issue.teamEstimation);

  const assigneeFallbackLabel = issue.assigneeUsername ?? "Unassigned";
  const assigneeFallbackIcon = issue.assigneeUsername ? (
    <AssigneeAvatar
      name={issue.assigneeName ?? issue.assigneeUsername}
      avatarUrl={issue.assigneeAvatarUrl}
    />
  ) : (
    <span className="linear-issue-details-empty-icon" />
  );

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
      searchShortcutLabel="L"
      ariaLabel="Add label"
      registerOpenMenu={(open) => {
        openLabelsRef.current = open;
      }}
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
          searchShortcutLabel="S"
          ariaLabel="Change status"
          registerOpenMenu={(open) => {
            openStatusRef.current = open;
          }}
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
          searchShortcutLabel="P"
          ariaLabel="Change priority"
          registerOpenMenu={(open) => {
            openPriorityRef.current = open;
          }}
          fallbackIcon={
            <LinearPriorityIcon priority={issue.priority} title={priorityLabel} />
          }
          fallbackLabel={priorityLabel}
        />
        {assigneeOptions.length > 0 ? (
          <LinearIssueDetailsPropertyDropdown
            value={selectedAssignee}
            options={assigneeOptions}
            onChange={onAssigneeChange}
            searchPlaceholder="Assign to…"
            searchShortcutLabel="A"
            ariaLabel="Change assignee"
            registerOpenMenu={(open) => {
              openAssigneeRef.current = open;
            }}
            fallbackIcon={assigneeFallbackIcon}
            fallbackLabel={assigneeFallbackLabel}
          />
        ) : issue.assigneeUsername ? (
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
            searchShortcutLabel="E"
            ariaLabel="Change estimate"
            registerOpenMenu={(open) => {
              openEstimateRef.current = open;
            }}
            fallbackIcon={estimateFallbackIcon}
            fallbackLabel={estimateLabel ?? "No estimate"}
          />
        ) : estimateLabel ? (
          <LinearIssueDetailsRow
            icon={estimateFallbackIcon}
            label={estimateLabel}
          />
        ) : null}
        <LinearIssueDueDatePropertyDropdown
          dueDate={issue.dueDate}
          onChange={onDueDateChange}
        />
      </LinearIssueDetailsSection>

      <LinearIssueDetailsSection title="Labels" headerAction={labelsHeaderAction}>
        {issue.labels.length > 0 ? (
          <ul className="linear-issue-details-label-list">
            {issue.labels.map((label) => (
              <li key={label.id || label.name}>
                <span
                  className="linear-issue-details-label"
                  title={githubLabelHoverTitle(label.name)}
                >
                  <LabelDot color={label.color} />
                  {abbreviateGithubLabelName(label.name)}
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
            label={abbreviateGithubLabelName(issue.projectName)}
            title={githubLabelHoverTitle(issue.projectName)}
          />
        </LinearIssueDetailsSection>
      ) : null}
    </div>
  );
}
