import { describe, expect, test } from "bun:test";
import {
  groupLinearProjectsByStatus,
  groupLinearProjectsByWorkflow,
  sortLinearProjectStatusesForDisplay,
} from "./linearProjectGroups";

const workspaceStatuses = sortLinearProjectStatusesForDisplay([
  { id: "backlog", name: "Backlog", type: "backlog", position: 0 },
  { id: "planned", name: "Planned", type: "planned", position: 1 },
  { id: "active", name: "In Progress", type: "started", position: 2 },
  { id: "done", name: "Completed", type: "completed", position: 3 },
  { id: "canceled", name: "Canceled", type: "canceled", position: 4 },
]);

describe("groupLinearProjectsByStatus", () => {
  test("groups projects by status and orders groups by lifecycle type", () => {
    const groups = groupLinearProjectsByStatus([
      {
        id: "1",
        name: "Alpha",
        status: { id: "done", name: "Done", type: "completed", position: 1 },
      },
      {
        id: "2",
        name: "Beta",
        status: { id: "ready", name: "Ready", type: "planned", position: 2 },
      },
      {
        id: "3",
        name: "Gamma",
        status: { id: "active", name: "In Progress", type: "started", position: 1 },
      },
      {
        id: "4",
        name: "Delta",
        status: { id: "ready", name: "Ready", type: "planned", position: 2 },
      },
    ]);

    expect(groups.map((group) => group.label)).toEqual(["In Progress", "Ready", "Done"]);
    expect(groups[0]?.projects.map((project) => project.name)).toEqual(["Gamma"]);
    expect(groups[1]?.projects.map((project) => project.name)).toEqual(["Beta", "Delta"]);
  });

  test("places projects without status last", () => {
    const groups = groupLinearProjectsByStatus([
      { id: "1", name: "No status project" },
      {
        id: "2",
        name: "Backlog project",
        status: { id: "backlog", name: "Backlog", type: "backlog", position: 0 },
      },
    ]);

    expect(groups.map((group) => group.label)).toEqual(["Backlog", "No status"]);
  });
});

describe("groupLinearProjectsByWorkflow", () => {
  test("shows every workspace status in display order, including empty groups", () => {
    const groups = groupLinearProjectsByWorkflow(
      [
        {
          id: "1",
          name: "Alpha",
          status: { id: "active", name: "In Progress", type: "started", position: 2 },
        },
      ],
      workspaceStatuses,
    );

    expect(groups.map((group) => group.label)).toEqual([
      "In Progress",
      "Planned",
      "Backlog",
      "Completed",
      "Canceled",
    ]);
    expect(groups.map((group) => group.projects.length)).toEqual([1, 0, 0, 0, 0]);
  });

  test("falls back to inferred grouping when workspace statuses are unavailable", () => {
    const groups = groupLinearProjectsByWorkflow(
      [
        {
          id: "1",
          name: "Alpha",
          status: { id: "active", name: "In Progress", type: "started", position: 2 },
        },
      ],
      [],
    );

    expect(groups.map((group) => group.label)).toEqual(["In Progress"]);
  });
});

describe("sortLinearProjectStatusesForDisplay", () => {
  test("orders statuses started, planned, backlog, completed, canceled", () => {
    expect(
      sortLinearProjectStatusesForDisplay([
        { id: "canceled", name: "Canceled", type: "canceled", position: 4 },
        { id: "backlog", name: "Backlog", type: "backlog", position: 0 },
        { id: "done", name: "Completed", type: "completed", position: 3 },
        { id: "planned", name: "Planned", type: "planned", position: 1 },
        { id: "active", name: "In Progress", type: "started", position: 2 },
      ]).map((status) => status.name),
    ).toEqual(["In Progress", "Planned", "Backlog", "Completed", "Canceled"]);
  });
});
