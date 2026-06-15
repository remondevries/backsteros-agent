import { describe, expect, test } from "bun:test";
import type { ProjectDocumentEntity } from "../../lib/documentStatusGroups";
import { meetingDocumentSidebarRowParts } from "./MeetingDocumentSidebarRow";

function sampleDocument(overrides: Partial<ProjectDocumentEntity> = {}): ProjectDocumentEntity {
  return {
    id: "1",
    linearDocumentId: "doc-1",
    projectId: "proj-1",
    projectName: "Backster OS",
    title: "2026-06-14 16:00 - Weekly sync",
    icon: "Calendar",
    status: "Inbox",
    statusGroup: "Inbox",
    organization: "Engineering",
    owner: "",
    category: "document",
    date: "2026-06-14",
    updatedAt: "2026-06-14T10:00:00.000Z",
    ...overrides,
  };
}

describe("meetingDocumentSidebarRowParts", () => {
  test("strips schedule prefix from title and reads time from title", () => {
    expect(meetingDocumentSidebarRowParts(sampleDocument())).toEqual({
      displayTitle: "Weekly sync",
      date: "2026-06-14",
      time: "16:00",
      organizationLabel: "Engineering",
    });
  });

  test("falls back to project name when organization is missing", () => {
    expect(
      meetingDocumentSidebarRowParts(
        sampleDocument({ organization: "", title: "2026-06-14 - Standup" }),
      ),
    ).toMatchObject({
      displayTitle: "Standup",
      organizationLabel: "Backster OS",
    });
  });
});
