import { describe, expect, test } from "bun:test";
import {
  isLinearMeetingDocumentIcon,
  LINEAR_MEETING_DOCUMENT_ICON,
  linearDocumentIconMatches,
} from "./linearDocumentIcons";

describe("linearDocumentIcons", () => {
  test("LINEAR_MEETING_DOCUMENT_ICON is Calendar", () => {
    expect(LINEAR_MEETING_DOCUMENT_ICON).toBe("Calendar");
    expect(isLinearMeetingDocumentIcon("Calendar")).toBe(true);
    expect(linearDocumentIconMatches("Calendar", LINEAR_MEETING_DOCUMENT_ICON)).toBe(true);
  });

  test("isLinearMeetingDocumentIcon rejects unrelated icons", () => {
    expect(isLinearMeetingDocumentIcon("Calendar")).toBe(true);
    expect(isLinearMeetingDocumentIcon("Initiative")).toBe(false);
    expect(isLinearMeetingDocumentIcon("📅")).toBe(false);
    expect(isLinearMeetingDocumentIcon("")).toBe(false);
    expect(isLinearMeetingDocumentIcon(null)).toBe(false);
  });
});
