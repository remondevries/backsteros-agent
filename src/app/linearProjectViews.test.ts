import { describe, expect, test } from "bun:test";
import {
  LINEAR_PROJECT_VIEWS,
  isLinearProjectViewId,
  linearProjectViewLabel,
} from "./linearProjectViews";

describe("linearProjectViews", () => {
  test("defines the project detail views", () => {
    expect(LINEAR_PROJECT_VIEWS.map((view) => view.label)).toEqual([
      "Overview",
      "Issues",
      "Watchers",
      "Documents",
      "Meetings",
      "Letters",
      "Activities",
    ]);
  });

  test("recognizes valid view ids", () => {
    expect(isLinearProjectViewId("overview")).toBe(true);
    expect(isLinearProjectViewId("letters")).toBe(true);
    expect(isLinearProjectViewId("unknown")).toBe(false);
  });

  test("returns labels for known views", () => {
    expect(linearProjectViewLabel("meetings")).toBe("Meetings");
  });
});
