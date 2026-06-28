import { describe, expect, test } from "bun:test";
import { isContentDetailViewOpen } from "./iosQuickActionVisibility";

describe("isContentDetailViewOpen", () => {
  test("treats linear document and issue as detail", () => {
    expect(
      isContentDetailViewOpen({
        activeLinearDocument: { id: "doc-1", title: "Note" },
        activeLinearIssue: null,
        activeVaultDocument: null,
      }),
    ).toBe(true);
    expect(
      isContentDetailViewOpen({
        activeLinearDocument: null,
        activeLinearIssue: { id: "issue-1", identifier: "BOS-1", title: "Task" },
        activeVaultDocument: null,
      }),
    ).toBe(true);
  });

  test("treats vault notes as detail but workout day sessions as list views", () => {
    expect(
      isContentDetailViewOpen({
        activeLinearDocument: null,
        activeLinearIssue: null,
        activeVaultDocument: { path: "Workouts/2026-06-16.csv", title: "Jun 16" },
      }),
    ).toBe(false);

    expect(
      isContentDetailViewOpen({
        activeLinearDocument: null,
        activeLinearIssue: null,
        activeVaultDocument: { path: "Workouts/dashboard.md", title: "Dashboard" },
      }),
    ).toBe(true);
  });
});
