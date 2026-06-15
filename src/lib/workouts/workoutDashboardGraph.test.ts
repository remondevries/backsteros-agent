import { describe, expect, test } from "bun:test";
import {
  WORKOUT_DASHBOARD_GRAPH_SCROLL_THRESHOLD_PX,
  nextWorkoutDashboardGraphCollapsed,
  workoutDashboardGraphCollapsed,
} from "./workoutDashboardGraph";

describe("workoutDashboardGraphCollapsed", () => {
  test("stays expanded until scroll passes the threshold", () => {
    expect(workoutDashboardGraphCollapsed(0)).toBe(false);
    expect(workoutDashboardGraphCollapsed(WORKOUT_DASHBOARD_GRAPH_SCROLL_THRESHOLD_PX)).toBe(false);
    expect(workoutDashboardGraphCollapsed(WORKOUT_DASHBOARD_GRAPH_SCROLL_THRESHOLD_PX + 1)).toBe(true);
  });
});

describe("nextWorkoutDashboardGraphCollapsed", () => {
  test("collapses past threshold and latches through layout scroll reset", () => {
    const collapsed = nextWorkoutDashboardGraphCollapsed(22, false, false);
    expect(collapsed).toEqual({ collapsed: true, ignoreExpandOnce: true });

    const afterLayoutJump = nextWorkoutDashboardGraphCollapsed(
      0,
      collapsed.collapsed,
      collapsed.ignoreExpandOnce,
    );
    expect(afterLayoutJump).toEqual({ collapsed: true, ignoreExpandOnce: false });
  });

  test("expands when user scrolls back to the top", () => {
    expect(nextWorkoutDashboardGraphCollapsed(0, true, false)).toEqual({
      collapsed: false,
      ignoreExpandOnce: false,
    });
  });
});
