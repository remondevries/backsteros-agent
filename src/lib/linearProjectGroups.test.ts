import { describe, expect, test } from "bun:test";
import { groupLinearProjectsByStatus } from "./linearProjectGroups";

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

    expect(groups.map((group) => group.label)).toEqual(["Ready", "In Progress", "Done"]);
    expect(groups[0]?.projects.map((project) => project.name)).toEqual(["Beta", "Delta"]);
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
