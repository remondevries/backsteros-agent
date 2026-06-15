import { describe, expect, test } from "bun:test";
import {
  isLinearMeetingDocumentIcon,
  LINEAR_MEETING_DOCUMENT_ICON,
} from "./linear-document-icons.ts";

describe("linear-document-icons", () => {
  test("matches Calendar icon from Linear meeting documents", () => {
    expect(LINEAR_MEETING_DOCUMENT_ICON).toBe("Calendar");
    expect(isLinearMeetingDocumentIcon("Calendar")).toBe(true);
  });

  test("rejects unrelated icons", () => {
    expect(isLinearMeetingDocumentIcon("Initiative")).toBe(false);
    expect(isLinearMeetingDocumentIcon("📅")).toBe(false);
    expect(isLinearMeetingDocumentIcon(null)).toBe(false);
  });
});
