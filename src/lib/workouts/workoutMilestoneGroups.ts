import { formatDailyMonthLabel } from "../dailyDocumentMonthGroups";
import type { WorkoutMilestoneEntity } from "../api";
import type { WorkoutPeriodViewId } from "./workoutPeriodViews";

export type { WorkoutMilestoneEntity };

export type WorkoutMilestonePeriodGroup = {
  key: string;
  label: string;
  milestones: WorkoutMilestoneEntity[];
};

/** @deprecated Use WorkoutMilestonePeriodGroup */
export type WorkoutMilestoneMonthGroup = WorkoutMilestonePeriodGroup;

export function workoutMilestoneDateKey(milestone: WorkoutMilestoneEntity): string | null {
  const targetDate = milestone.targetDate?.trim();
  if (targetDate) return targetDate;
  const nameMatch = /^(\d{4}-\d{2}-\d{2})$/.exec(milestone.name.trim());
  return nameMatch?.[1] ?? null;
}

export function hasWorkoutMilestoneForDate(
  milestones: WorkoutMilestoneEntity[],
  dateKey: string,
): boolean {
  const normalizedDate = dateKey.trim();
  if (!normalizedDate) return false;
  return milestones.some((milestone) => workoutMilestoneDateKey(milestone) === normalizedDate);
}

export function groupWorkoutMilestonesByMonth(
  milestones: WorkoutMilestoneEntity[],
): WorkoutMilestoneMonthGroup[] {
  const map = new Map<string, WorkoutMilestoneEntity[]>();

  for (const milestone of milestones) {
    const dateKey = workoutMilestoneDateKey(milestone);
    const monthKey = dateKey?.slice(0, 7) ?? "unknown";
    if (!map.has(monthKey)) map.set(monthKey, []);
    map.get(monthKey)!.push(milestone);
  }

  const groups: WorkoutMilestoneMonthGroup[] = [];
  for (const [key, items] of map.entries()) {
    items.sort((left, right) => {
      const leftDate = workoutMilestoneDateKey(left) ?? "";
      const rightDate = workoutMilestoneDateKey(right) ?? "";
      return rightDate.localeCompare(leftDate);
    });
    groups.push({
      key,
      label: key === "unknown" ? "Other" : formatDailyMonthLabel(key),
      milestones: items,
    });
  }

  return groups.sort((left, right) => right.key.localeCompare(left.key));
}

function workoutMilestoneQuarterKey(dateKey: string): string {
  const [yearPart, monthPart] = dateKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return "unknown";
  const quarter = Math.ceil(month / 3);
  return `${year}-Q${quarter}`;
}

function formatWorkoutQuarterLabel(key: string): string {
  if (key === "unknown") return "Other";
  const match = /^(\d{4})-Q(\d)$/.exec(key);
  if (!match) return key;
  return `Q${match[2]} ${match[1]}`;
}

function groupWorkoutMilestonesByKey(
  milestones: WorkoutMilestoneEntity[],
  resolveGroupKey: (dateKey: string | null) => string,
  resolveLabel: (key: string) => string,
): WorkoutMilestonePeriodGroup[] {
  const map = new Map<string, WorkoutMilestoneEntity[]>();

  for (const milestone of milestones) {
    const dateKey = workoutMilestoneDateKey(milestone);
    const groupKey = resolveGroupKey(dateKey);
    if (!map.has(groupKey)) map.set(groupKey, []);
    map.get(groupKey)!.push(milestone);
  }

  const groups: WorkoutMilestonePeriodGroup[] = [];
  for (const [key, items] of map.entries()) {
    items.sort((left, right) => {
      const leftDate = workoutMilestoneDateKey(left) ?? "";
      const rightDate = workoutMilestoneDateKey(right) ?? "";
      return rightDate.localeCompare(leftDate);
    });
    groups.push({
      key,
      label: resolveLabel(key),
      milestones: items,
    });
  }

  return groups.sort((left, right) => right.key.localeCompare(left.key));
}

export function groupWorkoutMilestonesByQuarter(
  milestones: WorkoutMilestoneEntity[],
): WorkoutMilestonePeriodGroup[] {
  return groupWorkoutMilestonesByKey(
    milestones,
    (dateKey) => (dateKey ? workoutMilestoneQuarterKey(dateKey) : "unknown"),
    formatWorkoutQuarterLabel,
  );
}

export function groupWorkoutMilestonesByYear(
  milestones: WorkoutMilestoneEntity[],
): WorkoutMilestonePeriodGroup[] {
  return groupWorkoutMilestonesByKey(
    milestones,
    (dateKey) => dateKey?.slice(0, 4) ?? "unknown",
    (key) => (key === "unknown" ? "Other" : key),
  );
}

export function groupWorkoutMilestonesForPeriodView(
  milestones: WorkoutMilestoneEntity[],
  view: WorkoutPeriodViewId,
): WorkoutMilestonePeriodGroup[] {
  switch (view) {
    case "yearly":
      return groupWorkoutMilestonesByYear(milestones);
    case "quarter":
      return groupWorkoutMilestonesByQuarter(milestones);
    default:
      return groupWorkoutMilestonesByMonth(milestones);
  }
}

export function workoutMilestoneGroupKeyForPeriodView(
  dateKey: string,
  view: WorkoutPeriodViewId,
): string {
  switch (view) {
    case "yearly":
      return dateKey.slice(0, 4);
    case "quarter":
      return workoutMilestoneQuarterKey(dateKey);
    default:
      return dateKey.slice(0, 7);
  }
}
