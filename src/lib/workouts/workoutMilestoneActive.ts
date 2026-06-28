import type { WorkoutMilestoneEntity } from "../api";
import { workoutMilestoneDateKey } from "./workoutMilestoneGroups";

export type WorkoutMilestoneStatus = "done" | "next" | "overdue" | "unstarted";

export function isWorkoutMilestoneFullyClosed(
  milestone: Pick<WorkoutMilestoneEntity, "status" | "progress">,
): boolean {
  const status = milestone.status?.trim().toLowerCase();
  if (status === "done") return true;
  const progress = milestone.progress;
  if (typeof progress === "number" && progress >= 1) return true;
  return false;
}

export function isWorkoutMilestoneActive(milestone: WorkoutMilestoneEntity): boolean {
  return !isWorkoutMilestoneFullyClosed(milestone);
}

export function findLatestActiveWorkoutMilestone(
  milestones: WorkoutMilestoneEntity[],
): WorkoutMilestoneEntity | null {
  return milestones.find((milestone) => !isWorkoutMilestoneFullyClosed(milestone)) ?? null;
}

export function findActiveWorkoutMilestoneForDate(
  milestones: WorkoutMilestoneEntity[],
  dateKey: string,
): WorkoutMilestoneEntity | null {
  const normalizedDate = dateKey.trim();
  const milestone = milestones.find((entry) => workoutMilestoneDateKey(entry) === normalizedDate);
  if (!milestone || isWorkoutMilestoneFullyClosed(milestone)) {
    return null;
  }
  return milestone;
}
