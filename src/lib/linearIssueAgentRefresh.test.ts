import { describe, expect, test } from "bun:test";
import { shouldRefreshLinearIssueFromAgentReply } from "./linearIssueAgentRefresh";

describe("shouldRefreshLinearIssueFromAgentReply", () => {
  test("refreshes on structured Linear update confirmations", () => {
    expect(
      shouldRefreshLinearIssueFromAgentReply("{{update:issue status|Linear}}"),
    ).toBe(true);
  });

  test("skips structured confirmations for non-Linear targets", () => {
    expect(
      shouldRefreshLinearIssueFromAgentReply("{{update:entry|daily log}}"),
    ).toBe(false);
  });

  test("refreshes on regular agent replies", () => {
    expect(
      shouldRefreshLinearIssueFromAgentReply("Updated the issue title to Draft spec."),
    ).toBe(true);
  });

  test("ignores empty replies", () => {
    expect(shouldRefreshLinearIssueFromAgentReply("   ")).toBe(false);
  });
});
