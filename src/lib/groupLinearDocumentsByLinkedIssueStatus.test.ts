import { describe, expect, test } from "bun:test";
import type { LinearIssueEntity } from "../chat/types";
import type { ProjectDocumentEntity } from "./documentStatusGroups";
import {
  groupLinearDocumentsByLinkedIssueStatus,
  UNLINKED_ISSUE_DOCUMENT_GROUP_KEY,
  UNKNOWN_ISSUE_DOCUMENT_GROUP_KEY,
} from "./groupLinearDocumentsByLinkedIssueStatus";

function doc(title: string, id = title): ProjectDocumentEntity {
  return {
    id,
    linearDocumentId: id,
    projectId: "proj",
    projectName: "P",
    title,
    status: "Inbox",
    statusGroup: "Inbox",
    organization: "",
    owner: "",
    category: "",
    date: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function issue(
  id: string,
  identifier: string,
  status: string,
  stateId: string,
  stateType: string,
): LinearIssueEntity {
  return {
    id,
    identifier,
    title: `Issue ${identifier}`,
    status,
    stateId,
    stateType,
  };
}

const workflowStates = [
  { id: "state-triage", name: "Triage", type: "triage", position: 0 },
  { id: "state-progress", name: "In Progress", type: "started", position: 1 },
  { id: "state-done", name: "Done", type: "completed", position: 2 },
];

describe("groupLinearDocumentsByLinkedIssueStatus", () => {
  test("groups documents by linked issue workflow state", () => {
    const documents = [
      doc("L-1 - First letter", "d1"),
      doc("L-2 - Second letter", "d2"),
      doc("Plain letter", "d3"),
      {
        ...doc("Native link letter", "d4"),
        linkedIssueId: "i2",
        linkedIssueIdentifier: "L-2",
        title: "Native link letter",
      },
    ];
    const issues = [
      issue("i1", "L-1", "Triage", "state-triage", "triage"),
      issue("i2", "L-2", "In Progress", "state-progress", "started"),
    ];

    const groups = groupLinearDocumentsByLinkedIssueStatus(documents, issues, workflowStates);

    expect(groups).toHaveLength(3);
    expect(groups[0]?.key).toBe("state-progress");
    expect(groups[0]?.documents.map((item) => item.id).sort()).toEqual(["d2", "d4"]);
    expect(groups[1]?.key).toBe("state-triage");
    expect(groups[1]?.documents.map((item) => item.id)).toEqual(["d1"]);
    expect(groups[2]?.key).toBe(UNLINKED_ISSUE_DOCUMENT_GROUP_KEY);
    expect(groups[2]?.documents.map((item) => item.id)).toEqual(["d3"]);
  });

  test("puts missing issue links in Issue not found group", () => {
    const documents = [doc("L-99 - Orphan", "d1")];
    const groups = groupLinearDocumentsByLinkedIssueStatus(documents, [], workflowStates);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.key).toBe(UNKNOWN_ISSUE_DOCUMENT_GROUP_KEY);
    expect(groups[0]?.documents).toHaveLength(1);
  });
});
