import { describe, expect, test } from "bun:test";
import type { WorkoutGroupSetEntity, WorkoutRepEntity } from "../api";
import { repVolumeProgressPercent, sumGroupSetRepCount, sumSessionGroupSetWeightKg, normalizeNumericInput } from "./workoutRepDisplay";

function rep(partial: Partial<WorkoutRepEntity> & Pick<WorkoutRepEntity, "id">): WorkoutRepEntity {
  return {
    identifier: partial.identifier ?? partial.id,
    title: partial.title ?? "0",
    description: partial.description ?? null,
    reps: partial.reps ?? null,
    labels: partial.labels ?? [],
    ...partial,
  };
}

describe("repVolumeProgressPercent", () => {
  test("scales by weight × reps volume relative to the max set in the group", () => {
    const groupReps = [
      rep({ id: "1", title: "80", description: "10" }),
      rep({ id: "2", title: "100", description: "5" }),
    ];

    expect(repVolumeProgressPercent(groupReps, groupReps[0]!)).toBe(100);
    expect(repVolumeProgressPercent(groupReps, groupReps[1]!)).toBe(63);
  });
});

describe("sumGroupSetRepCount", () => {
  test("sums rep counts across all sets in a group", () => {
    const reps = [
      rep({ id: "1", title: "80", description: "10" }),
      rep({ id: "2", title: "90", description: "8", reps: 8 }),
    ];
    expect(sumGroupSetRepCount(reps)).toBe(18);
  });
});

describe("sumSessionGroupSetWeightKg", () => {
  test("sums weight across all parent group sets", () => {
    const groupSets: WorkoutGroupSetEntity[] = [
      {
        id: "g1",
        identifier: "W-1",
        title: "Bench",
        exercise: "Bench",
        reps: [
          rep({ id: "r1", title: "80" }),
          rep({ id: "r2", title: "90" }),
        ],
      },
      {
        id: "g2",
        identifier: "W-2",
        title: "Squat",
        exercise: "Squat",
        reps: [rep({ id: "r3", title: "100" })],
      },
    ];

    expect(sumSessionGroupSetWeightKg(groupSets)).toBe(270);
  });
});

describe("normalizeNumericInput", () => {
  test("keeps digits and a single decimal separator", () => {
    expect(normalizeNumericInput("12.5kg")).toBe("12.5");
    expect(normalizeNumericInput("12.5.3")).toBe("12.53");
    expect(normalizeNumericInput(".5")).toBe(".5");
  });
});
