import { describe, expect, test } from "bun:test";
import {
  findClosestWorkoutExerciseLabel,
  hasWorkoutExerciseLabelMatch,
  resolveWorkoutExerciseFromLabels,
} from "./workoutExerciseLabelMatch";

const labels = [
  { id: "1", name: "Bench Press", color: "#00a933" },
  { id: "2", name: "Overhead Press", color: "#00a933" },
  { id: "3", name: "Pull Up", color: "#00a933" },
];

describe("workoutExerciseLabelMatch", () => {
  test("resolves exact and prefix matches to canonical label names", () => {
    expect(resolveWorkoutExerciseFromLabels("bench press", labels)).toEqual({
      text: "Bench Press",
      labelId: "1",
      matched: true,
    });
    expect(resolveWorkoutExerciseFromLabels("bench", labels)).toEqual({
      text: "Bench Press",
      labelId: "1",
      matched: true,
    });
  });

  test("returns unmatched text when no label fits", () => {
    expect(resolveWorkoutExerciseFromLabels("unknown move", labels)).toEqual({
      text: "unknown move",
      labelId: null,
      matched: false,
    });
    expect(hasWorkoutExerciseLabelMatch("unknown move", labels)).toBe(false);
  });

  test("prefers the strongest closest match", () => {
    expect(findClosestWorkoutExerciseLabel("press", labels)?.label.name).toBe("Bench Press");
    expect(findClosestWorkoutExerciseLabel("overhead", labels)?.label.name).toBe("Overhead Press");
  });
});
