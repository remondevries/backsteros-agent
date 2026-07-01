import { describe, expect, mock, test } from "bun:test";
import type { StoredMutation } from "./types";

const notifyLinearDocumentListChange = mock(() => {});

mock.module("../linearDocumentListEvents", () => ({
  notifyLinearDocumentListChange,
}));

mock.module("../linearIssueListEvents", () => ({
  notifyLinearIssueListChange: mock(() => {}),
}));

mock.module("../linearIssueDetailSeed", () => ({
  clearLinearIssueDetailSeed: mock(() => {}),
  migrateLinearIssueDetailSeed: mock(() => {}),
  seedLinearIssueDetailFromEntity: mock(() => {}),
}));

mock.module("../linearDocumentContentSeed", () => ({
  clearLinearDocumentContentSeed: mock(() => {}),
  migrateLinearDocumentContentSeed: mock(() => {}),
  seedLinearDocumentContentFromEntity: mock(() => {}),
}));

const { applyOptimisticMutation, reconcileDocumentUpdateSuccess } = await import("./optimistic");

describe("document.update optimistic patches", () => {
  test("includes projectId and clears names when org/project change", () => {
    notifyLinearDocumentListChange.mockClear();

    const mutation: StoredMutation = {
      id: "mutation-1",
      entityKey: "document:doc-1",
      status: "pending",
      retryCount: 0,
      createdAt: Date.now(),
      payload: {
        type: "document.update",
        payload: {
          documentId: "doc-1",
          updates: {
            teamId: "team-new",
            projectId: "project-new",
          },
        },
      },
    };

    applyOptimisticMutation(mutation);

    expect(notifyLinearDocumentListChange).toHaveBeenCalledWith({
      type: "update",
      linearDocumentId: "doc-1",
      patch: expect.objectContaining({
        projectId: "project-new",
        projectName: undefined,
        organization: undefined,
      }),
    });
  });
});

describe("reconcileDocumentUpdateSuccess", () => {
  test("includes authoritative project and organization names", () => {
    notifyLinearDocumentListChange.mockClear();

    reconcileDocumentUpdateSuccess("doc-1", "doc-1", {
      title: "Weekly sync",
      updatedAt: "2026-01-02T00:00:00.000Z",
      projectId: "project-new",
      projectName: "New Project",
      teamName: "Engineering",
    });

    expect(notifyLinearDocumentListChange).toHaveBeenCalledWith({
      type: "update",
      linearDocumentId: "doc-1",
      patch: {
        title: "Weekly sync",
        updatedAt: "2026-01-02T00:00:00.000Z",
        linkedIssueId: undefined,
        linkedIssueIdentifier: undefined,
        projectId: "project-new",
        projectName: "New Project",
        organization: "Engineering",
      },
    });
  });
});
