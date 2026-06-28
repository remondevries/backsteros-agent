import { describe, expect, test } from "bun:test";
import { focusContextUsesLinearMcp, toolSelectionForFocusContext } from "./focus-tools.ts";

describe("focusContextUsesLinearMcp", () => {
  test("skips MCP for linear documents with injected content", () => {
    expect(
      focusContextUsesLinearMcp({
        kind: "linear_document",
        documentId: "doc-1",
        title: "Spec",
        content: "Body",
      }),
    ).toBe(false);
  });

  test("uses MCP for project workspace focus", () => {
    expect(
      focusContextUsesLinearMcp({
        kind: "linear_workspace",
        workspaceKind: "project",
        workspaceId: "p1",
        name: "BacksterOS",
        view: "issues",
      }),
    ).toBe(true);
  });
});

describe("toolSelectionForFocusContext", () => {
  test("enables obsidian for vault documents only", () => {
    expect(
      toolSelectionForFocusContext({
        kind: "linear_document",
        documentId: "doc-1",
      }),
    ).toEqual({
      obsidian: false,
      linear: false,
      calendar: false,
      whoop: false,
    });

    expect(
      toolSelectionForFocusContext({
        kind: "vault_document",
        path: "Daily/note.md",
      }),
    ).toMatchObject({ obsidian: true, linear: false });
  });
});
