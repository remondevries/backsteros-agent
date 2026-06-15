import { describe, expect, test } from "vitest";
import type { LinearIssueEntity } from "../chat/types";
import {
  groupLinearIssuesByStatus,
  groupLinearIssuesByWorkflow,
} from "./groupLinearIssuesByStatus";

const workflowStates = [
  { id: "backlog", name: "Backlog", type: "backlog", position: 0, color: "#bec2c8" },
  { id: "todo", name: "Todo", type: "unstarted", position: 1, color: "#e2e2e2" },
  { id: "progress", name: "In Progress", type: "started", position: 2, color: "#fabd00" },
  { id: "review", name: "In Review", type: "started", position: 3, color: "#00a933" },
  { id: "done", name: "Done", type: "completed", position: 4, color: "#5c6ada" },
];

function issue(partial: Partial<LinearIssueEntity> & Pick<LinearIssueEntity, "id">): LinearIssueEntity {
  return {
    id: partial.id,
    identifier: partial.identifier ?? partial.id.toUpperCase(),
    title: partial.title ?? "Issue",
    status: partial.status ?? "Todo",
    stateId: partial.stateId ?? null,
    stateType: partial.stateType,
    statusColor: partial.statusColor,
    url: partial.url ?? "https://linear.app/issue",
    priority: partial.priority ?? 0,
    priorityLabel: partial.priorityLabel ?? "No priority",
    assigneeName: partial.assigneeName ?? null,
    assigneeAvatarUrl: partial.assigneeAvatarUrl ?? null,
    dueDate: partial.dueDate ?? null,
    estimate: partial.estimate ?? null,
    labels: partial.labels ?? [],
    projectName: partial.projectName ?? "Project",
    createdAt: partial.createdAt ?? null,
    updatedAt: partial.updatedAt ?? null,
  };
}

describe("groupLinearIssuesByWorkflow", () => {
  test("includes empty workflow states", () => {
    const groups = groupLinearIssuesByWorkflow(
      [
        issue({
          id: "i1",
          identifier: "PRJ-1",
          status: "In Progress",
          stateId: "progress",
          stateType: "started",
        }),
      ],
      workflowStates,
    );

    expect(groups.map((group) => group.status)).toEqual([
      "In Review",
      "In Progress",
      "Todo",
      "Backlog",
      "Done",
    ]);
    expect(groups.find((group) => group.status === "Todo")?.issues).toEqual([]);
    expect(groups.find((group) => group.status === "In Progress")?.issues).toHaveLength(1);
  });

  test("orders groups by workflow type then position", () => {
    const groups = groupLinearIssuesByWorkflow([], workflowStates);
    expect(groups.map((group) => group.stateId)).toEqual([
      "review",
      "progress",
      "todo",
      "backlog",
      "done",
    ]);
  });

  test("falls back to issue-only grouping when workflow states are missing", () => {
    const groups = groupLinearIssuesByStatus([
      issue({ id: "i1", status: "In Review", stateId: "review", stateType: "started" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.status).toBe("In Review");
  });
});
