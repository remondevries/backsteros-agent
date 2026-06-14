import { describe, expect, test } from "bun:test";
import { linearIssueDetailToListPatch } from "./linearIssueListPatch";
import type { LinearIssueDetail } from "./api";

function sampleIssue(overrides: Partial<LinearIssueDetail> = {}): LinearIssueDetail {
  return {
    id: "issue-1",
    identifier: "BOS-42",
    title: "Fix sync",
    description: null,
    url: "https://linear.app/issue/BOS-42",
    status: "In Progress",
    stateId: "state-1",
    stateType: "started",
    statusColor: "#f00",
    priority: 2,
    priorityLabel: "High",
    assigneeId: "user-1",
    assigneeName: "Alex",
    assigneeUsername: "alex",
    assigneeAvatarUrl: "https://example.com/avatar.png",
    dueDate: "2026-06-14",
    estimate: 3,
    branchName: null,
    projectId: "project-1",
    projectName: "Backster OS",
    labels: [{ id: "label-1", name: "bug", color: "#0f0" }],
    availableLabels: [],
    workflowStates: [],
    teamMembers: [],
    teamEstimation: null,
    ...overrides,
  };
}

describe("linearIssueDetailToListPatch", () => {
  test("maps detail fields used by project issue rows", () => {
    expect(linearIssueDetailToListPatch(sampleIssue())).toEqual({
      identifier: "BOS-42",
      title: "Fix sync",
      status: "In Progress",
      stateId: "state-1",
      stateType: "started",
      statusColor: "#f00",
      priority: 2,
      priorityLabel: "High",
      assigneeId: "user-1",
      assigneeName: "Alex",
      assigneeAvatarUrl: "https://example.com/avatar.png",
      dueDate: "2026-06-14",
      estimate: 3,
      labels: [{ name: "bug", color: "#0f0" }],
    });
  });

  test("clears nullable assignee and due date fields", () => {
    expect(
      linearIssueDetailToListPatch(
        sampleIssue({ assigneeId: null, assigneeName: null, assigneeAvatarUrl: null, dueDate: null }),
      ),
    ).toEqual({
      identifier: "BOS-42",
      title: "Fix sync",
      status: "In Progress",
      stateId: "state-1",
      stateType: "started",
      statusColor: "#f00",
      priority: 2,
      priorityLabel: "High",
      assigneeId: undefined,
      assigneeName: undefined,
      assigneeAvatarUrl: undefined,
      dueDate: undefined,
      estimate: 3,
      labels: [{ name: "bug", color: "#0f0" }],
    });
  });
});
