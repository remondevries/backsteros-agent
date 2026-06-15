import { LINEAR_PRIORITY_LABELS, getPriorityLabel } from "../chat/linearPriority";
import { formatLinearEstimateLabel, formatLinearIssueDueDate } from "../chat/linearIssue";
import type { SearchableDropdownOption } from "../app/ui/SearchableDropdown";
import { searchableDropdownShortcut } from "../app/ui/searchableDropdownShortcuts";

export type LinearTeamEstimationSettings = {
  issueEstimationType: string;
  issueEstimationAllowZero: boolean;
  issueEstimationExtended: boolean;
};

export const DEFAULT_LINEAR_TEAM_ESTIMATION_SETTINGS: LinearTeamEstimationSettings = {
  issueEstimationType: "linear",
  issueEstimationAllowZero: true,
  issueEstimationExtended: false,
};

export const LINEAR_ISSUE_MAX_ESTIMATE = 5;

export const LINEAR_UNASSIGNED_ASSIGNEE_VALUE = "__none__";

export const LINEAR_NO_DUE_DATE_VALUE = "__no_due_date__";
export const LINEAR_PICK_DUE_DATE_VALUE = "__pick_due_date__";

export type LinearIssueTeamMemberOption = {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
};

const ESTIMATE_SCALE_VALUES = [0, 1, 2, 3, 4, 5] as const;

export function buildLinearPriorityDropdownOptions(): SearchableDropdownOption[] {
  return LINEAR_PRIORITY_LABELS.map((label, priority) => ({
    value: String(priority),
    label,
    shortcut: searchableDropdownShortcut(priority),
    searchTerms: label,
  }));
}

export function linearPriorityDropdownValue(priority: number | undefined | null): string {
  if (priority == null || priority < 0 || priority > 4) return "0";
  return String(priority);
}

function estimateOptionLabel(value: number): string {
  if (value === 0) return "No estimate";
  return formatLinearEstimateLabel(value) ?? `${value} Points`;
}

export function buildLinearEstimateScaleValues(
  settings: LinearTeamEstimationSettings | null | undefined,
): number[] {
  if (!settings) return [];

  const type = settings.issueEstimationType.trim();
  if (!type || type === "notUsed") return [];

  return [...ESTIMATE_SCALE_VALUES];
}

export function resolveLinearTeamEstimationSettings(
  settings: LinearTeamEstimationSettings | null | undefined,
  options?: { allowDefaultWhenMissing?: boolean },
): LinearTeamEstimationSettings | null {
  if (settings) {
    const type = settings.issueEstimationType.trim();
    if (!type || type === "notUsed") return null;
    return settings;
  }
  return options?.allowDefaultWhenMissing ? DEFAULT_LINEAR_TEAM_ESTIMATION_SETTINGS : null;
}

export function buildLinearEstimateDropdownOptions(
  settings: LinearTeamEstimationSettings | null | undefined,
): SearchableDropdownOption[] {
  const values = buildLinearEstimateScaleValues(settings);
  if (values.length === 0) return [];

  return values.map((value, index) => ({
    value: String(value),
    label: estimateOptionLabel(value),
    shortcut: searchableDropdownShortcut(index),
    searchTerms: value === 0 ? "no estimate none" : String(value),
  }));
}

export function linearEstimateDropdownValue(
  estimate: number | null | undefined,
  settings: LinearTeamEstimationSettings | null | undefined,
): string | null {
  const values = buildLinearEstimateScaleValues(settings);
  if (values.length === 0) return null;

  if (estimate == null || !Number.isFinite(estimate) || estimate <= 0) {
    return "0";
  }

  const rounded = Math.min(Math.max(Math.round(estimate), 1), LINEAR_ISSUE_MAX_ESTIMATE);
  return String(rounded);
}

export function linearPriorityLabelFromValue(value: string): string {
  const priority = Number(value);
  return getPriorityLabel(Number.isFinite(priority) ? priority : 0);
}

export function linearEstimateLabelFromValue(
  value: string,
  settings: LinearTeamEstimationSettings | null | undefined,
): string {
  void settings;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "No estimate";
  return estimateOptionLabel(Math.min(numeric, LINEAR_ISSUE_MAX_ESTIMATE));
}

export function isLinearNoEstimateValue(value: string | null | undefined): boolean {
  if (value == null) return true;
  const numeric = Number(value);
  return !Number.isFinite(numeric) || numeric <= 0;
}

export function buildLinearAssigneeDropdownOptions(
  members: LinearIssueTeamMemberOption[],
): SearchableDropdownOption[] {
  const sorted = [...members].sort((left, right) => left.name.localeCompare(right.name));
  return [
    {
      value: LINEAR_UNASSIGNED_ASSIGNEE_VALUE,
      label: "No assignee",
      shortcut: searchableDropdownShortcut(0),
      searchTerms: "unassigned none",
    },
    ...sorted.map((member, index) => ({
      value: member.id,
      label: member.username ?? member.name,
      shortcut: searchableDropdownShortcut(index + 1),
      searchTerms: `${member.name} ${member.username ?? ""}`.trim(),
    })),
  ];
}

export function linearAssigneeDropdownValue(assigneeId: string | null | undefined): string {
  const id = assigneeId?.trim();
  return id ? id : LINEAR_UNASSIGNED_ASSIGNEE_VALUE;
}

export function linearAssigneeIdFromDropdownValue(value: string): string | null {
  return value === LINEAR_UNASSIGNED_ASSIGNEE_VALUE ? null : value;
}

function formatLinearDueDateYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addLocalDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

export function linearDueDateDropdownValue(dueDate: string | null | undefined): string {
  const ymd = (dueDate ?? "").trim().slice(0, 10);
  return ymd || LINEAR_NO_DUE_DATE_VALUE;
}

export function linearDueDateFromDropdownValue(value: string): string | null {
  if (value === LINEAR_NO_DUE_DATE_VALUE || value === LINEAR_PICK_DUE_DATE_VALUE) {
    return null;
  }
  const ymd = value.trim().slice(0, 10);
  return ymd || null;
}

export function isLinearPickDueDateValue(value: string): boolean {
  return value === LINEAR_PICK_DUE_DATE_VALUE;
}

export function buildLinearDueDateDropdownOptions(
  currentDueDate: string | null | undefined,
  now = new Date(),
  noDueDateLabel = "No due date",
): SearchableDropdownOption[] {
  const today = formatLinearDueDateYmd(now);
  const tomorrow = formatLinearDueDateYmd(addLocalDays(now, 1));
  const nextWeek = formatLinearDueDateYmd(addLocalDays(now, 7));

  const presetEntries: Array<{ value: string; label: string; searchTerms?: string }> = [
    { value: today, label: "Today", searchTerms: "today" },
    { value: tomorrow, label: "Tomorrow", searchTerms: "tomorrow" },
    { value: nextWeek, label: "In one week", searchTerms: "week 7 days" },
  ];

  const current = (currentDueDate ?? "").trim().slice(0, 10);
  if (current && !presetEntries.some((entry) => entry.value === current)) {
    presetEntries.unshift({
      value: current,
      label: formatLinearIssueDueDate(current) ?? current,
      searchTerms: current,
    });
  }

  const options: SearchableDropdownOption[] = presetEntries.map((entry, index) => ({
    ...entry,
    shortcut: searchableDropdownShortcut(index),
  }));

  options.push({
    value: LINEAR_PICK_DUE_DATE_VALUE,
    label: "Pick a date…",
    shortcut: searchableDropdownShortcut(options.length),
    searchTerms: "custom calendar pick choose date",
  });

  options.push({
    value: LINEAR_NO_DUE_DATE_VALUE,
    label: noDueDateLabel,
    shortcut: searchableDropdownShortcut(options.length),
    searchTerms: "none clear remove",
  });

  return options;
}
