import { LINEAR_PRIORITY_LABELS, getPriorityLabel } from "../chat/linearPriority";
import { formatLinearEstimateLabel } from "../chat/linearIssue";
import type { SearchableDropdownOption } from "../app/ui/SearchableDropdown";
import { searchableDropdownShortcut } from "../app/ui/searchableDropdownShortcuts";

export type LinearTeamEstimationSettings = {
  issueEstimationType: string;
  issueEstimationAllowZero: boolean;
  issueEstimationExtended: boolean;
};

export const LINEAR_ISSUE_MAX_ESTIMATE = 5;

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
