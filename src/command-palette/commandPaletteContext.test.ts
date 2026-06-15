import { describe, expect, test } from "bun:test";
import {
  applyCommandPaletteContextRanking,
  getCommandPaletteContextLabel,
  resolveCommandPaletteSearchContext,
  withTeamProjects,
  type CommandPaletteSearchContext,
} from "./commandPaletteSearchContext";
import type { CommandPaletteItem, CommandPaletteSection } from "./types";

function emptyGrouped(): Record<CommandPaletteSection, CommandPaletteItem[]> {
  return {
    Navigate: [],
    Notes: [],
    Projects: [],
    Issues: [],
    Inbox: [],
    "Linear documents": [],
    KB: [],
    Contacts: [],
    Organizations: [],
    Letters: [],
    Meetings: [],
    Financials: [],
  };
}

describe("resolveCommandPaletteSearchContext", () => {
  test("returns null when settings are open", () => {
    expect(
      resolveCommandPaletteSearchContext({
        activeVaultNavItem: "meetings",
        linearSelection: null,
        settingsOpen: true,
      }),
    ).toBeNull();
  });

  test("returns null when no sidebar item is active", () => {
    expect(
      resolveCommandPaletteSearchContext({
        activeVaultNavItem: null,
        linearSelection: null,
        settingsOpen: false,
      }),
    ).toBeNull();
  });

  test("returns vault-folder context for vault sidebar items", () => {
    expect(
      resolveCommandPaletteSearchContext({
        activeVaultNavItem: "meetings",
        linearSelection: null,
        settingsOpen: false,
      }),
    ).toEqual({
      kind: "vault-folder",
      navItemId: "meetings",
      label: "Meetings",
    });
  });

  test("returns linear-project context when a project is selected", () => {
    expect(
      resolveCommandPaletteSearchContext({
        activeVaultNavItem: "projects",
        linearSelection: { kind: "project", id: "proj-1", name: "Backster OS" },
        settingsOpen: false,
      }),
    ).toEqual({
      kind: "linear-project",
      projectId: "proj-1",
      projectName: "Backster OS",
    });
  });

  test("returns linear-team context when a team is selected", () => {
    expect(
      resolveCommandPaletteSearchContext({
        activeVaultNavItem: "projects",
        linearSelection: { kind: "team", id: "team-1", name: "Engineering" },
        settingsOpen: false,
      }),
    ).toEqual({
      kind: "linear-team",
      teamId: "team-1",
      teamName: "Engineering",
      projectIds: [],
      projectNames: [],
    });
  });

  test("returns null on projects overview without selection", () => {
    expect(
      resolveCommandPaletteSearchContext({
        activeVaultNavItem: "projects",
        linearSelection: null,
        settingsOpen: false,
      }),
    ).toBeNull();
  });
});

describe("getCommandPaletteContextLabel", () => {
  test("returns the context name for vault, project, and team", () => {
    expect(
      getCommandPaletteContextLabel({
        kind: "vault-folder",
        navItemId: "inbox",
        label: "Inbox",
      }),
    ).toBe("Inbox");

    expect(
      getCommandPaletteContextLabel({
        kind: "linear-project",
        projectId: "proj-1",
        projectName: "Backster OS",
      }),
    ).toBe("Backster OS");

    expect(
      getCommandPaletteContextLabel({
        kind: "linear-team",
        teamId: "team-1",
        teamName: "Engineering",
        projectIds: [],
        projectNames: [],
      }),
    ).toBe("Engineering");
  });
});

describe("applyCommandPaletteContextRanking", () => {
  test("prioritizes vault notes from the active folder", () => {
    const grouped = emptyGrouped();
    grouped.Notes = [
      {
        kind: "vault-note",
        id: "Inbox/a.md",
        section: "Notes",
        label: "A",
        subtitle: "Inbox/a.md",
        path: "Inbox/a.md",
        title: "A",
        navItemId: "inbox",
      },
      {
        kind: "vault-note",
        id: "Meetings/b.md",
        section: "Notes",
        label: "B",
        subtitle: "Meetings/b.md",
        path: "Meetings/b.md",
        title: "B",
        navItemId: "meetings",
      },
    ];

    const context: CommandPaletteSearchContext = {
      kind: "vault-folder",
      navItemId: "meetings",
      label: "Meetings",
    };

    const ranked = applyCommandPaletteContextRanking(grouped, context);
    expect(ranked.Notes.map((item) => item.id)).toEqual(["Meetings/b.md", "Inbox/a.md"]);
  });

  test("prioritizes project and issue matches for linear-project context", () => {
    const grouped = emptyGrouped();
    grouped.Projects = [
      {
        kind: "linear-project",
        id: "other",
        section: "Projects",
        label: "Other",
        projectId: "other",
        projectName: "Other",
      },
      {
        kind: "linear-project",
        id: "proj-1",
        section: "Projects",
        label: "Backster OS",
        projectId: "proj-1",
        projectName: "Backster OS",
      },
    ];
    grouped.Issues = [
      {
        kind: "linear-issue",
        id: "issue-1",
        section: "Issues",
        label: "BOS-1",
        issue: { id: "issue-1", title: "One", projectName: "Other" },
      },
      {
        kind: "linear-issue",
        id: "issue-2",
        section: "Issues",
        label: "BOS-2",
        issue: { id: "issue-2", title: "Two", projectId: "proj-1", projectName: "Backster OS" },
      },
    ];

    const ranked = applyCommandPaletteContextRanking(grouped, {
      kind: "linear-project",
      projectId: "proj-1",
      projectName: "Backster OS",
    });

    expect(ranked.Projects.map((item) => item.id)).toEqual(["proj-1", "other"]);
    expect(ranked.Issues.map((item) => item.id)).toEqual(["issue-2", "issue-1"]);
  });

  test("prioritizes team workspace matches for linear-team context", () => {
    const grouped = emptyGrouped();
    grouped.Projects = [
      {
        kind: "linear-project",
        id: "other",
        section: "Projects",
        label: "Other",
        projectId: "other",
        projectName: "Other",
      },
      {
        kind: "linear-project",
        id: "proj-1",
        section: "Projects",
        label: "Backster OS",
        projectId: "proj-1",
        projectName: "Backster OS",
      },
    ];
    grouped.Issues = [
      {
        kind: "linear-issue",
        id: "issue-1",
        section: "Issues",
        label: "BOS-1",
        issue: { id: "issue-1", title: "One", projectName: "Other" },
      },
      {
        kind: "linear-issue",
        id: "issue-2",
        section: "Issues",
        label: "BOS-2",
        issue: { id: "issue-2", title: "Two", projectName: "Backster OS" },
      },
    ];

    const context = withTeamProjects(
      {
        kind: "linear-team",
        teamId: "team-1",
        teamName: "Engineering",
        projectIds: [],
        projectNames: [],
      },
      [{ id: "proj-1", name: "Backster OS" }],
    )!;

    const ranked = applyCommandPaletteContextRanking(grouped, context);
    expect(ranked.Projects.map((item) => item.id)).toEqual(["proj-1", "other"]);
    expect(ranked.Issues.map((item) => item.id)).toEqual(["issue-2", "issue-1"]);
  });
});
