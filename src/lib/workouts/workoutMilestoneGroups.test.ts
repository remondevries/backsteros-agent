import { describe, expect, it } from "vitest";
import {
  hasWorkoutMilestoneForDate,
  workoutMilestoneDateKey,
} from "./workoutMilestoneGroups";
import type { WorkoutMilestoneEntity } from "../api";

function milestone(partial: Partial<WorkoutMilestoneEntity> & Pick<WorkoutMilestoneEntity, "id">) {
  return {
    name: partial.name ?? "2026-06-14",
    targetDate: partial.targetDate ?? null,
    projectId: partial.projectId ?? "project-1",
    status: partial.status ?? "unstarted",
    progress: partial.progress ?? 0,
    ...partial,
  } satisfies WorkoutMilestoneEntity;
}

describe("hasWorkoutMilestoneForDate", () => {
  it("matches milestone targetDate", () => {
    const milestones = [milestone({ id: "m-1", targetDate: "2026-06-14", name: "Session" })];
    expect(hasWorkoutMilestoneForDate(milestones, "2026-06-14")).toBe(true);
    expect(hasWorkoutMilestoneForDate(milestones, "2026-06-13")).toBe(false);
  });

  it("matches milestone name when it is a date key", () => {
    const milestones = [milestone({ id: "m-2", targetDate: null, name: "2026-06-14" })];
    expect(workoutMilestoneDateKey(milestones[0]!)).toBe("2026-06-14");
    expect(hasWorkoutMilestoneForDate(milestones, "2026-06-14")).toBe(true);
  });
});
