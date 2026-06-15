import { describe, expect, test } from "bun:test";
import {
  defaultWorkoutYearProjectId,
  listWorkoutYearProjects,
} from "./workoutYearProjects";

describe("listWorkoutYearProjects", () => {
  test("returns year-named projects excluding Personal Records, newest first", () => {
    const projects = listWorkoutYearProjects([
      { id: "pr", name: "Personal Records" },
      { id: "2024", name: "2024" },
      { id: "misc", name: "Templates" },
      { id: "2026", name: "2026" },
    ]);

    expect(projects.map((project) => project.name)).toEqual(["2026", "2024"]);
  });
});

describe("defaultWorkoutYearProjectId", () => {
  test("prefers the project matching the reference year", () => {
    const projects = [
      { id: "2024", name: "2024" },
      { id: "2026", name: "2026" },
    ];

    expect(defaultWorkoutYearProjectId(projects, 2024)).toBe("2024");
  });
});
