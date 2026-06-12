import { describe, expect, test } from "bun:test";
import {
  buildChatFocusContext,
  composerContextItems,
  isChatFocusContextLoading,
} from "./chatFocusContext";

describe("buildChatFocusContext", () => {
  test("returns vault document when open in explorer", () => {
    const context = buildChatFocusContext({
      activeLinearIssue: null,
      activeLinearDocument: null,
      activeVaultDocument: { path: "Daily/note.md", title: "Note" },
      linearSelection: { kind: "project", id: "p1", name: "Project" },
      linearWorkspaceView: "issues",
      focusContentSnapshot: { kind: "vault_document", title: "Note", body: "Body" },
    });

    expect(context?.kind).toBe("vault_document");
  });

  test("returns linear document when open in project section", () => {
    const context = buildChatFocusContext({
      activeLinearIssue: null,
      activeLinearDocument: { id: "doc-1", title: "Spec", projectId: "p1" },
      activeVaultDocument: null,
      linearSelection: { kind: "project", id: "p1", name: "Project" },
      linearWorkspaceView: "documents",
      focusContentSnapshot: { kind: "linear_document", title: "Spec", content: "Body" },
    });

    expect(context?.kind).toBe("linear_document");
    expect(context).toMatchObject({
      documentId: "doc-1",
      title: "Spec",
      projectId: "p1",
      content: "Body",
    });
  });

  test("returns issue when open over workspace", () => {
    const context = buildChatFocusContext({
      activeLinearIssue: { id: "i1", identifier: "BOS-1", title: "Issue" },
      activeLinearDocument: null,
      activeVaultDocument: null,
      linearSelection: { kind: "project", id: "p1", name: "Project" },
      linearWorkspaceView: "issues",
      focusContentSnapshot: { kind: "linear_issue", description: "Desc" },
    });

    expect(context?.kind).toBe("linear_issue");
  });

  test("returns workspace when browsing a project", () => {
    const context = buildChatFocusContext({
      activeLinearIssue: null,
      activeLinearDocument: null,
      activeVaultDocument: null,
      linearSelection: { kind: "project", id: "p1", name: "BacksterOS" },
      linearWorkspaceView: "issues",
      focusContentSnapshot: null,
    });

    expect(context).toEqual({
      kind: "linear_workspace",
      workspaceKind: "project",
      workspaceId: "p1",
      name: "BacksterOS",
      view: "issues",
      summary: undefined,
      description: undefined,
    });
  });
});

describe("isChatFocusContextLoading", () => {
  test("linear document loads until snapshot arrives", () => {
    const context = buildChatFocusContext({
      activeLinearIssue: null,
      activeLinearDocument: { id: "doc-1", title: "Spec" },
      activeVaultDocument: null,
      linearSelection: null,
      linearWorkspaceView: null,
      focusContentSnapshot: null,
    });

    expect(context && isChatFocusContextLoading(context, null)).toBe(true);
    expect(
      context &&
        isChatFocusContextLoading(context, {
          kind: "linear_document",
          title: "Spec",
          content: "",
        }),
    ).toBe(false);
  });

  test("project workspace loads until snapshot arrives", () => {
    const context = buildChatFocusContext({
      activeLinearIssue: null,
      activeLinearDocument: null,
      activeVaultDocument: null,
      linearSelection: { kind: "project", id: "p1", name: "BacksterOS" },
      linearWorkspaceView: "overview",
      focusContentSnapshot: null,
    });

    expect(context && isChatFocusContextLoading(context, null)).toBe(true);
    expect(
      context &&
        isChatFocusContextLoading(context, {
          kind: "linear_workspace",
          summary: null,
          description: null,
        }),
    ).toBe(false);
  });
});

describe("composerContextItems", () => {
  test("includes linear status icon metadata for issues", () => {
    const context = buildChatFocusContext({
      activeLinearIssue: {
        id: "issue-1",
        identifier: "BOS-70",
        title: "Spec",
        status: "In Progress",
        stateType: "started",
      },
      activeLinearDocument: null,
      activeVaultDocument: null,
      linearSelection: null,
      linearWorkspaceView: null,
      focusContentSnapshot: null,
    });

    expect(context && composerContextItems(context)).toEqual([
      {
        id: "issue-1",
        label: "BOS-70 · Spec",
        issueIdentifier: "BOS-70",
        issueTitle: "Spec",
        status: "In Progress",
        stateType: "started",
      },
    ]);
  });

  test("uses linear document id for linear documents", () => {
    const context = buildChatFocusContext({
      activeLinearIssue: null,
      activeLinearDocument: { id: "doc-1", title: "Spec" },
      activeVaultDocument: null,
      linearSelection: null,
      linearWorkspaceView: null,
      focusContentSnapshot: null,
    });

    expect(context && composerContextItems(context)).toEqual([
      { id: "doc-1", label: "Spec" },
    ]);
  });
});
