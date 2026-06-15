import { describe, expect, test } from "bun:test";
import type { ProjectDocumentEntity } from "./documentStatusGroups";
import {
  formatMeetingWeekGroupLabel,
  groupMeetingDocumentsByWeek,
  resolveMeetingDocumentWeekKey,
} from "./meetingDocumentWeekGroups";

function sampleDocument(
  id: string,
  title: string,
  date: string | null = null,
): ProjectDocumentEntity {
  return {
    id,
    linearDocumentId: id,
    projectId: "proj-1",
    projectName: "Backster OS",
    title,
    icon: "Calendar",
    status: "Inbox",
    statusGroup: "Inbox",
    organization: "Engineering",
    owner: "",
    category: "document",
    date,
    updatedAt: "2026-06-14T10:00:00.000Z",
  };
}

describe("meetingDocumentWeekGroups", () => {
  test("formats week labels as Week N", () => {
    expect(formatMeetingWeekGroupLabel("2026-W01")).toBe("Week 1");
    expect(formatMeetingWeekGroupLabel("2026-W24")).toBe("Week 24");
    expect(formatMeetingWeekGroupLabel("unknown")).toBe("No date");
  });

  test("resolves ISO week from meeting title date", () => {
    expect(resolveMeetingDocumentWeekKey(sampleDocument("a", "2026-06-09 - Sync"))).toBe(
      "2026-W24",
    );
  });

  test("groups meetings by week and sorts newest week first", () => {
    const groups = groupMeetingDocumentsByWeek([
      sampleDocument("a", "2026-06-02 - Early", "2026-06-02"),
      sampleDocument("b", "2026-06-09 09:00 - Later", "2026-06-09"),
      sampleDocument("c", "Untitled note"),
    ]);

    expect(groups.map((group) => group.label)).toEqual(["Week 24", "Week 23", "No date"]);
    expect(groups[0]?.entries.map((entry) => entry.id)).toEqual(["b"]);
    expect(groups[1]?.entries.map((entry) => entry.id)).toEqual(["a"]);
    expect(groups[2]?.entries.map((entry) => entry.id)).toEqual(["c"]);
  });
});
