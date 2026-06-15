import { describe, expect, test } from "bun:test";
import type { ProjectDocumentEntity } from "./documentStatusGroups";
import {
  buildKnowledgeBaseProjectFolders,
  filterKnowledgeBaseDocuments,
  groupProjectDocumentsByProject,
  KNOWLEDGE_BASE_NO_PROJECT_KEY,
  selectKnowledgeBaseDocuments,
} from "./knowledgeBaseProjectGroups";

function doc(
  overrides: Partial<ProjectDocumentEntity> & Pick<ProjectDocumentEntity, "linearDocumentId" | "title">,
): ProjectDocumentEntity {
  return {
    id: overrides.linearDocumentId,
    projectId: "project-a",
    projectName: "Alpha",
    status: "Inbox",
    statusGroup: "Inbox",
    organization: "",
    owner: "",
    category: "Document",
    date: null,
    updatedAt: "2026-06-14T00:00:00.000Z",
    ...overrides,
  };
}

describe("knowledgeBaseProjectGroups", () => {
  test("groups documents by project name in alphabetical order", () => {
    const groups = groupProjectDocumentsByProject([
      doc({ linearDocumentId: "1", title: "Doc 1", projectId: "p-beta", projectName: "Beta" }),
      doc({ linearDocumentId: "2", title: "Doc 2", projectId: "p-alpha", projectName: "Alpha" }),
      doc({ linearDocumentId: "3", title: "Doc 3", projectId: "p-alpha", projectName: "Alpha" }),
    ]);

    expect(groups.map((group) => group.label)).toEqual(["Alpha", "Beta"]);
    expect(groups[0]?.entries.map((entry) => entry.linearDocumentId)).toEqual(["3", "2"]);
  });

  test("puts documents without a project in a trailing group", () => {
    const groups = groupProjectDocumentsByProject([
      doc({ linearDocumentId: "1", title: "Doc 1", projectId: "", projectName: "" }),
      doc({ linearDocumentId: "2", title: "Doc 2", projectId: "p-alpha", projectName: "Alpha" }),
    ]);

    expect(groups.map((group) => group.key)).toEqual(["p-alpha", KNOWLEDGE_BASE_NO_PROJECT_KEY]);
    expect(groups[1]?.label).toBe("No project");
  });

  test("filters by document title or project name", () => {
    const documents = [
      doc({ linearDocumentId: "1", title: "Architecture", projectId: "p-alpha", projectName: "Alpha" }),
      doc({ linearDocumentId: "2", title: "Notes", projectId: "p-beta", projectName: "Beta" }),
      doc({ linearDocumentId: "3", title: "Other", projectId: "p-beta", projectName: "Beta" }),
    ];

    expect(filterKnowledgeBaseDocuments(documents, "arch").map((entry) => entry.linearDocumentId)).toEqual([
      "1",
    ]);
    expect(filterKnowledgeBaseDocuments(documents, "beta").map((entry) => entry.linearDocumentId)).toEqual([
      "2",
      "3",
    ]);
  });

  test("excludes meeting documents with the Calendar icon", () => {
    const documents = [
      doc({ linearDocumentId: "1", title: "Architecture", icon: "Initiative" }),
      doc({ linearDocumentId: "2", title: "Weekly sync", icon: "Calendar" }),
    ];

    expect(selectKnowledgeBaseDocuments(documents).map((entry) => entry.linearDocumentId)).toEqual(["1"]);
  });

  test("includes empty team projects as folders", () => {
    const folders = buildKnowledgeBaseProjectFolders(
      [doc({ linearDocumentId: "1", title: "Doc 1", projectId: "p-alpha", projectName: "Alpha" })],
      [
        { id: "p-alpha", name: "Alpha" },
        { id: "p-empty", name: "Empty" },
      ],
    );

    expect(folders.map((folder) => folder.key)).toEqual(["p-alpha", "p-empty"]);
    expect(folders.find((folder) => folder.key === "p-empty")?.entries).toEqual([]);
  });
});
