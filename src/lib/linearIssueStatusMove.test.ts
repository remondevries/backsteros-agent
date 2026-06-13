import { describe, expect, test } from "bun:test";
import type { LinearIssueEntity } from "../chat/types";
import {
  applyIssueStatusOverrides,
  canonicalStatusKey,
  computeStatusMoveDropIndicator,
  toStatusMoveTargetGroup,
} from "./linearIssueStatusMove";

function issue(partial: Partial<LinearIssueEntity> & Pick<LinearIssueEntity, "id">): LinearIssueEntity {
  return {
    id: partial.id,
    title: partial.title ?? "Issue",
    identifier: partial.identifier ?? partial.id,
    status: partial.status ?? "Backlog",
    stateId: partial.stateId ?? "state-1",
    priority: partial.priority ?? 0,
  };
}

describe("linearIssueStatusMove", () => {
  test("canonicalStatusKey normalizes completed and cancelled", () => {
    expect(canonicalStatusKey("Completed")).toBe("done");
    expect(canonicalStatusKey("Cancelled")).toBe("canceled");
  });

  test("applyIssueStatusOverrides merges optimistic status updates", () => {
    const issues = [issue({ id: "1", status: "Backlog", stateId: "s1" })];
    const next = applyIssueStatusOverrides(issues, {
      "1": { stateId: "s2", status: "In Progress", stateType: "started" },
    });
    expect(next[0]?.status).toBe("In Progress");
    expect(next[0]?.stateId).toBe("s2");
  });

  test("computeStatusMoveDropIndicator skips same-state moves", () => {
    const dragged = issue({ id: "1", stateId: "s1" });
    const group = toStatusMoveTargetGroup({
      status: "Backlog",
      issues: [dragged],
      stateId: "s1",
    });
    expect(computeStatusMoveDropIndicator(group, dragged)).toBeNull();
  });

  test("computeStatusMoveDropIndicator targets another status group", () => {
    const dragged = issue({ id: "1", stateId: "s1", priority: 1 });
    const group = toStatusMoveTargetGroup({
      status: "In Progress",
      issues: [issue({ id: "2", stateId: "s2", priority: 2 })],
      stateId: "s2",
    });
    expect(computeStatusMoveDropIndicator(group, dragged)).toEqual({
      stateId: "s2",
      beforeIssueId: "2",
    });
  });
});
