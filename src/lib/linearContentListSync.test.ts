import { describe, expect, mock, test } from "bun:test";
import type { ChatFocusContext } from "./chatFocusContext";

const requestLinearIssueDetailRefresh = mock(() => {});
const notifyLinearDocumentListChange = mock(() => {});
const notifyVaultContentChanged = mock(() => {});

mock.module("./linearIssueDetailRefreshEvents", () => ({
  requestLinearIssueDetailRefresh,
}));

mock.module("./linearDocumentListEvents", () => ({
  notifyLinearDocumentListChange,
}));

mock.module("./vaultContentEvents", () => ({
  notifyVaultContentChanged,
}));

const { applyAgentContentSideEffects } = await import("./linearContentListSync");

describe("applyAgentContentSideEffects", () => {
  test("refreshes focused Linear issue after substantive agent reply", () => {
    requestLinearIssueDetailRefresh.mockClear();
    const focus: ChatFocusContext = {
      kind: "linear_issue",
      issueId: "issue-1",
      identifier: "BOS-1",
      title: "Test",
    };

    applyAgentContentSideEffects("Updated the issue title.", focus);

    expect(requestLinearIssueDetailRefresh).toHaveBeenCalledTimes(1);
  });

  test("does not refresh Linear issue when vault is focused and reply is generic", () => {
    requestLinearIssueDetailRefresh.mockClear();
    const focus: ChatFocusContext = {
      kind: "vault_document",
      path: "daily/2026-06-14.md",
      title: "Daily",
    };

    applyAgentContentSideEffects("Done.", focus);

    expect(requestLinearIssueDetailRefresh).not.toHaveBeenCalled();
  });

  test("notifies vault when focused and reply confirms a vault update", () => {
    notifyVaultContentChanged.mockClear();
    const focus: ChatFocusContext = {
      kind: "vault_document",
      path: "daily/2026-06-14.md",
      title: "Daily",
    };

    applyAgentContentSideEffects("{{update:entry|daily note}}", focus);

    expect(notifyVaultContentChanged).toHaveBeenCalledTimes(1);
  });

  test("refreshes Linear document list when document is focused", () => {
    notifyLinearDocumentListChange.mockClear();
    const focus: ChatFocusContext = {
      kind: "linear_document",
      documentId: "doc-1",
      title: "Spec",
      projectId: "project-1",
    };

    applyAgentContentSideEffects("Updated wording in the intro.", focus);

    expect(notifyLinearDocumentListChange).toHaveBeenCalledWith({
      type: "refresh",
      documentId: "doc-1",
    });
  });
});
