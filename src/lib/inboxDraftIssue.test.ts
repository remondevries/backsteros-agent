import { describe, expect, test } from "bun:test";
import {
  createInboxDraftIssue,
  formatLinearIssueBreadcrumbLabel,
  isInboxDraftIssueId,
  resolveLinearIssueTabLabel,
} from "./inboxDraftIssue";

describe("inboxDraftIssue", () => {
  test("detects draft issue ids", () => {
    const draft = createInboxDraftIssue();
    expect(isInboxDraftIssueId(draft.id)).toBe(true);
    expect(isInboxDraftIssueId("real-linear-id")).toBe(false);
  });

  test("hides identifier labels only in inbox context", () => {
    const real = { id: "issue-1", identifier: "BOS-70", title: "Ship inbox" };

    expect(formatLinearIssueBreadcrumbLabel(real, { hideIdentifier: true })).toBe("Ship inbox");
    expect(resolveLinearIssueTabLabel(real, { hideIdentifier: true })).toBe("Ship inbox");

    expect(formatLinearIssueBreadcrumbLabel(real)).toBe("BOS-70 Ship inbox");
    expect(resolveLinearIssueTabLabel(real)).toBe("BOS-70");
  });

  test("draft issues fall back to title outside inbox too", () => {
    const draft = createInboxDraftIssue();
    expect(formatLinearIssueBreadcrumbLabel({ ...draft, title: "Untitled" })).toBe("Untitled");
    expect(resolveLinearIssueTabLabel({ ...draft, title: "Untitled" })).toBe("Untitled");
  });
});
