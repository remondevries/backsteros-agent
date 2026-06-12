import { describe, expect, test } from "bun:test";
import {
  DOCUMENT_STATUS_ORDER,
  getDocumentStatusGroup,
  groupDocumentsByStatus,
} from "./documentStatusGroups";

describe("documentStatusGroups", () => {
  test("normalizes note statuses into document workflow groups", () => {
    expect(getDocumentStatusGroup("")).toBe("Inbox");
    expect(getDocumentStatusGroup("triage")).toBe("Inbox");
    expect(getDocumentStatusGroup("In Progress")).toBe("In Progress");
    expect(getDocumentStatusGroup("On Hold")).toBe("On Hold");
    expect(getDocumentStatusGroup("Archive")).toBe("Archived");
    expect(getDocumentStatusGroup("archived")).toBe("Archived");
  });

  test("groups documents in fixed status order", () => {
    const groups = groupDocumentsByStatus([
      {
        id: "a",
        path: "a.md",
        title: "A",
        status: "On Hold",
        statusGroup: "On Hold",
        organization: "",
        owner: "",
        category: "",
        date: null,
      },
      {
        id: "b",
        path: "b.md",
        title: "B",
        status: "Inbox",
        statusGroup: "Inbox",
        organization: "",
        owner: "",
        category: "",
        date: null,
      },
    ]);

    expect(groups.map((group) => group.status)).toEqual(["Inbox", "On Hold"]);
    expect(DOCUMENT_STATUS_ORDER).toContain("Archived");
  });
});
