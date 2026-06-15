import { describe, expect, test } from "bun:test";
import {
  collectWorkspaceSetupLinearTeamIds,
  excludeWorkspaceSetupLinearTeams,
  excludeWorkspaceSetupTeamDropdownOptions,
  excludeWorkspaceSetupTeamProjects,
  workspaceSetupLinearTeamIdSet,
} from "./workspaceSetupTeamIds";

describe("collectWorkspaceSetupLinearTeamIds", () => {
  test("returns unique trimmed team ids", () => {
    expect(
      collectWorkspaceSetupLinearTeamIds({
        inboxLinearTeamId: "team-inbox",
        dailyLinearTeamId: " team-daily ",
        workoutsLinearTeamId: "team-inbox",
        lettersLinearTeamId: null,
        knowledgeBaseLinearTeamId: "team-kb",
        addressbookLinearTeamId: "",
      }),
    ).toEqual(["team-inbox", "team-daily", "team-kb"]);
  });
});

describe("excludeWorkspaceSetupTeamProjects", () => {
  test("removes projects whose ids are in the exclusion set", () => {
    const projects = [
      { id: "p1", name: "Alpha" },
      { id: "p2", name: "Inbox folder" },
      { id: "p3", name: "Beta" },
    ];
    const excluded = new Set(["p2"]);

    expect(excludeWorkspaceSetupTeamProjects(projects, excluded)).toEqual([
      { id: "p1", name: "Alpha" },
      { id: "p3", name: "Beta" },
    ]);
  });
});

describe("workspaceSetupLinearTeamIdSet", () => {
  test("returns a set of configured team ids", () => {
    const set = workspaceSetupLinearTeamIdSet({
      inboxLinearTeamId: "team-inbox",
      dailyLinearTeamId: "team-daily",
    });
    expect(set.has("team-inbox")).toBe(true);
    expect(set.has("team-daily")).toBe(true);
    expect(set.size).toBe(2);
  });
});

describe("excludeWorkspaceSetupLinearTeams", () => {
  test("removes teams whose ids are in the exclusion set", () => {
    const teams = [
      { id: "t1", name: "Acme" },
      { id: "t2", name: "Inbox" },
      { id: "t3", name: "Beta" },
    ];
    const excluded = new Set(["t2"]);

    expect(excludeWorkspaceSetupLinearTeams(teams, excluded)).toEqual([
      { id: "t1", name: "Acme" },
      { id: "t3", name: "Beta" },
    ]);
  });
});

describe("excludeWorkspaceSetupTeamDropdownOptions", () => {
  test("removes dropdown options for excluded team ids", () => {
    const options = [
      { value: "t1", label: "Acme" },
      { value: "t2", label: "Inbox" },
    ];
    const excluded = new Set(["t2"]);

    expect(excludeWorkspaceSetupTeamDropdownOptions(options, excluded)).toEqual([
      { value: "t1", label: "Acme" },
    ]);
  });
});
