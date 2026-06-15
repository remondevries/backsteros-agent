import { describe, expect, test } from "bun:test";
import { countWorkoutSessionSubIssues } from "./workoutSubIssueCount";
import type { WorkoutSessionEntity } from "../api";

describe("countWorkoutSessionSubIssues", () => {
  test("returns zero for missing session", () => {
    expect(countWorkoutSessionSubIssues(null)).toBe(0);
    expect(countWorkoutSessionSubIssues(undefined)).toBe(0);
  });

  test("sums rep sub-issues across group sets", () => {
    const session: WorkoutSessionEntity = {
      date: "2026-06-14",
      projectId: "project-1",
      milestoneId: "milestone-1",
      groupSets: [
        {
          id: "gs-1",
          identifier: "BOS-1",
          title: "Bench",
          dueDate: "2026-06-14",
          status: "In Progress",
          stateId: "state-1",
          exercise: "Bench",
          reps: [
            {
              id: "rep-1",
              identifier: "BOS-2",
              title: "Set 1",
              description: null,
              reps: 8,
              labels: [],
            },
            {
              id: "rep-2",
              identifier: "BOS-3",
              title: "Set 2",
              description: null,
              reps: 8,
              labels: [],
            },
          ],
          createdAt: null,
        },
        {
          id: "gs-2",
          identifier: "BOS-4",
          title: "Squat",
          dueDate: "2026-06-14",
          status: "In Progress",
          stateId: "state-1",
          exercise: "Squat",
          reps: [
            {
              id: "rep-3",
              identifier: "BOS-5",
              title: "Set 1",
              description: null,
              reps: 5,
              labels: [],
            },
          ],
          createdAt: null,
        },
      ],
    };

    expect(countWorkoutSessionSubIssues(session)).toBe(3);
  });
});
