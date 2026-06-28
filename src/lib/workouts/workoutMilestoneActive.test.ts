import { describe, expect, test } from "bun:test";
import type { WorkoutMilestoneEntity } from "../api";
import {
  findActiveWorkoutMilestoneForDate,
  findLatestActiveWorkoutMilestone,
  isWorkoutMilestoneActive,
  isWorkoutMilestoneFullyClosed,
} from "./workoutMilestoneActive";

function milestone(
  partial: Partial<WorkoutMilestoneEntity> & Pick<WorkoutMilestoneEntity, "id">,
): WorkoutMilestoneEntity {
  return {
    name: partial.name ?? "2026-06-14",
    targetDate: partial.targetDate ?? "2026-06-14",
    projectId: partial.projectId ?? "project-1",
    status: partial.status ?? "unstarted",
    progress: partial.progress ?? 0,
    ...partial,
  };
}

describe("isWorkoutMilestoneFullyClosed", () => {
  test("treats done status as closed", () => {
    expect(isWorkoutMilestoneFullyClosed(milestone({ id: "m-1", status: "done" }))).toBe(true);
  });

  test("treats full progress as closed", () => {
    expect(isWorkoutMilestoneFullyClosed(milestone({ id: "m-2", progress: 1 }))).toBe(true);
  });

  test("treats incomplete milestones as open", () => {
    expect(isWorkoutMilestoneFullyClosed(milestone({ id: "m-3", status: "next", progress: 0.5 }))).toBe(
      false,
    );
  });
});

describe("findLatestActiveWorkoutMilestone", () => {
  test("returns the most recent milestone that is not fully closed", () => {
    const milestones = [
      milestone({ id: "m-new", targetDate: "2026-06-16", status: "next" }),
      milestone({ id: "m-old", targetDate: "2026-06-14", status: "overdue" }),
    ];
    expect(findLatestActiveWorkoutMilestone(milestones)?.id).toBe("m-new");
  });

  test("returns null when every milestone is closed", () => {
    const milestones = [milestone({ id: "m-done", targetDate: "2026-06-16", status: "done" })];
    expect(findLatestActiveWorkoutMilestone(milestones)).toBeNull();
  });
});

describe("findActiveWorkoutMilestoneForDate", () => {
  test("returns today's milestone when it is not fully closed", () => {
    const milestones = [milestone({ id: "m-1", targetDate: "2026-06-14", status: "next" })];
    expect(findActiveWorkoutMilestoneForDate(milestones, "2026-06-14")?.id).toBe("m-1");
    expect(isWorkoutMilestoneActive(milestones[0]!)).toBe(true);
  });

  test("returns null when today's milestone is done", () => {
    const milestones = [milestone({ id: "m-2", targetDate: "2026-06-14", status: "done" })];
    expect(findActiveWorkoutMilestoneForDate(milestones, "2026-06-14")).toBeNull();
  });

  test("returns null when no milestone exists for the date", () => {
    expect(findActiveWorkoutMilestoneForDate([], "2026-06-14")).toBeNull();
  });
});
