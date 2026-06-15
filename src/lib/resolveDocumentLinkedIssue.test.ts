import { describe, expect, test } from "vitest";
import {
  hasDocumentLinkedIssue,
  resolveDocumentLinkedIssue,
} from "./resolveDocumentLinkedIssue";

describe("resolveDocumentLinkedIssue", () => {
  test("prefers native issue link fields over title prefix", () => {
    const ref = resolveDocumentLinkedIssue({
      title: "Tax notice",
      linkedIssueId: "issue-uuid",
      linkedIssueIdentifier: "L-1",
    });
    expect(ref.issueId).toBe("issue-uuid");
    expect(ref.issueIdentifier).toBe("L-1");
    expect(ref.displayTitle).toBe("Tax notice");
    expect(ref.usesLegacyTitleLink).toBe(false);
    expect(hasDocumentLinkedIssue({ title: "Tax notice", linkedIssueId: "issue-uuid" })).toBe(true);
  });

  test("falls back to legacy title prefix", () => {
    const ref = resolveDocumentLinkedIssue({ title: "L-42 - Old letter" });
    expect(ref.issueId).toBeNull();
    expect(ref.issueIdentifier).toBe("L-42");
    expect(ref.displayTitle).toBe("Old letter");
    expect(ref.usesLegacyTitleLink).toBe(true);
  });
});
