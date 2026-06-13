import { describe, expect, test } from "bun:test";
import {
  LINEAR_PROJECT_VIEWS,
  LINEAR_TEAM_VIEWS,
  isLinearProjectViewId,
  isLinearTeamViewId,
  isLinearWorkspaceViewIdForKind,
  linearProjectViewLabel,
  linearTeamViewLabel,
  linearWorkspaceViewsForKind,
} from "./linearProjectViews";

describe("linearProjectViews", () => {
  test("defines the project detail views", () => {
    expect(LINEAR_PROJECT_VIEWS.map((view) => view.label)).toEqual([
      "Overview",
      "Issues",
      "Documents",
      "Meetings",
      "Letters",
      "Activities",
    ]);
  });

  test("defines the team detail views", () => {
    expect(LINEAR_TEAM_VIEWS.map((view) => view.label)).toEqual([
      "Overview",
      "Projects",
      "Documents",
      "Meetings",
      "Letters",
      "Activities",
    ]);
  });

  test("returns views by selection kind", () => {
    expect(linearWorkspaceViewsForKind("team")).toBe(LINEAR_TEAM_VIEWS);
    expect(linearWorkspaceViewsForKind("project")).toBe(LINEAR_PROJECT_VIEWS);
  });

  test("recognizes valid project view ids", () => {
    expect(isLinearProjectViewId("overview")).toBe(true);
    expect(isLinearProjectViewId("letters")).toBe(true);
    expect(isLinearProjectViewId("projects")).toBe(false);
    expect(isLinearProjectViewId("unknown")).toBe(false);
  });

  test("recognizes valid team view ids", () => {
    expect(isLinearTeamViewId("projects")).toBe(true);
    expect(isLinearTeamViewId("issues")).toBe(false);
  });

  test("validates view ids for the active selection kind", () => {
    expect(isLinearWorkspaceViewIdForKind("team", "projects")).toBe(true);
    expect(isLinearWorkspaceViewIdForKind("team", "issues")).toBe(false);
    expect(isLinearWorkspaceViewIdForKind("project", "issues")).toBe(true);
    expect(isLinearWorkspaceViewIdForKind("project", "projects")).toBe(false);
  });

  test("returns labels for known views", () => {
    expect(linearProjectViewLabel("meetings")).toBe("Meetings");
    expect(linearTeamViewLabel("projects")).toBe("Projects");
  });
});
