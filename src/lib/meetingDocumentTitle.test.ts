import { describe, expect, test } from "bun:test";
import {
  buildMeetingDocumentTitle,
  formatMeetingDocumentTimeLabel,
  meetingDocumentDateFromTitle,
  meetingDocumentDisplayTitle,
  parseMeetingDocumentTitle,
} from "./meetingDocumentTitle";

describe("parseMeetingDocumentTitle", () => {
  test("parses ISO date prefix", () => {
    expect(parseMeetingDocumentTitle("2026-06-14 - Team sync")).toEqual({
      date: "2026-06-14",
      time: null,
      displayTitle: "Team sync",
    });
  });

  test("parses date and time prefix", () => {
    expect(parseMeetingDocumentTitle("2026-06-14 14:30 - Team sync")).toEqual({
      date: "2026-06-14",
      time: "14:30",
      displayTitle: "Team sync",
    });
  });

  test("returns full title when no prefix", () => {
    expect(parseMeetingDocumentTitle("Team sync")).toEqual({
      date: null,
      time: null,
      displayTitle: "Team sync",
    });
  });
});

describe("buildMeetingDocumentTitle", () => {
  test("prefixes display title with date", () => {
    expect(buildMeetingDocumentTitle("2026-06-14", "Team sync")).toBe("2026-06-14 - Team sync");
  });

  test("prefixes display title with date and time", () => {
    expect(buildMeetingDocumentTitle("2026-06-14", "Team sync", "14:30")).toBe(
      "2026-06-14 14:30 - Team sync",
    );
  });

  test("returns display title when date is missing", () => {
    expect(buildMeetingDocumentTitle(null, "Team sync")).toBe("Team sync");
  });

  test("defaults empty display title to Untitled", () => {
    expect(buildMeetingDocumentTitle("2026-06-14", "")).toBe("2026-06-14 - Untitled");
  });
});

describe("meetingDocumentDisplayTitle", () => {
  test("strips date prefix for list display", () => {
    expect(meetingDocumentDisplayTitle("2026-06-14 - Team sync")).toBe("Team sync");
  });

  test("strips date and time prefix for list display", () => {
    expect(meetingDocumentDisplayTitle("2026-06-14 14:30 - Team sync")).toBe("Team sync");
  });
});

describe("meetingDocumentDateFromTitle", () => {
  test("reads date prefix", () => {
    expect(meetingDocumentDateFromTitle("2026-06-14 - Team sync")).toBe("2026-06-14");
  });

  test("reads date from datetime prefix", () => {
    expect(meetingDocumentDateFromTitle("2026-06-14 14:30 - Team sync")).toBe("2026-06-14");
  });
});

describe("formatMeetingDocumentTimeLabel", () => {
  test("formats 24h time for display", () => {
    expect(formatMeetingDocumentTimeLabel("14:30")).toMatch(/2:30/);
  });
});
