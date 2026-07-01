import { describe, expect, test } from "bun:test";
import {
  applyLinearDocumentContentUpdates,
  linearDocumentContentToListPatch,
  mergeLinearDocumentListPatch,
} from "./linearDocumentContentPatch";
import type { LinearDocumentContent } from "./api";

const baseDocument: LinearDocumentContent = {
  id: "doc-1",
  title: "Weekly sync",
  content: "Notes",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  teamId: "team-old",
  teamName: "Old Org",
  projectId: "project-old",
  projectName: "Old Project",
};

describe("applyLinearDocumentContentUpdates", () => {
  test("clears projectName when projectId changes without a new name", () => {
    const next = applyLinearDocumentContentUpdates(baseDocument, {
      projectId: "project-new",
    });

    expect(next.projectId).toBe("project-new");
    expect(next.projectName).toBeUndefined();
  });

  test("clears teamName when teamId changes without a new name", () => {
    const next = applyLinearDocumentContentUpdates(baseDocument, {
      teamId: "team-new",
    });

    expect(next.teamId).toBe("team-new");
    expect(next.teamName).toBeUndefined();
  });

  test("keeps provided project and team names", () => {
    const next = applyLinearDocumentContentUpdates(baseDocument, {
      projectId: "project-new",
      projectName: "New Project",
      teamId: "team-new",
      teamName: "New Org",
    });

    expect(next.projectName).toBe("New Project");
    expect(next.teamName).toBe("New Org");
  });
});

describe("linearDocumentContentToListPatch", () => {
  test("maps teamName to organization for list entities", () => {
    expect(
      linearDocumentContentToListPatch({
        title: "Weekly sync",
        updatedAt: "2026-01-02T00:00:00.000Z",
        projectId: "project-1",
        projectName: "Alpha",
        teamName: "Engineering",
      }),
    ).toEqual({
      title: "Weekly sync",
      updatedAt: "2026-01-02T00:00:00.000Z",
      projectId: "project-1",
      projectName: "Alpha",
      organization: "Engineering",
      linkedIssueId: undefined,
      linkedIssueIdentifier: undefined,
    });
  });
});

describe("mergeLinearDocumentListPatch", () => {
  test("merges authoritative names without touching content", () => {
    const next = mergeLinearDocumentListPatch(baseDocument, {
      projectId: "project-new",
      projectName: "New Project",
      organization: "New Org",
      updatedAt: "2026-01-03T00:00:00.000Z",
    });

    expect(next.content).toBe("Notes");
    expect(next.projectId).toBe("project-new");
    expect(next.projectName).toBe("New Project");
    expect(next.teamName).toBe("New Org");
    expect(next.updatedAt).toBe("2026-01-03T00:00:00.000Z");
  });
});
