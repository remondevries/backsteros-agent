import { describe, expect, test } from "bun:test";
import {
  canCoalesceMutation,
  mergeDocumentUpdates,
  mergeIntoStoredMutation,
  mergeIssueUpdates,
} from "./coalesce";
import type { StoredMutation } from "./types";

describe("linearSync coalesce", () => {
  test("merges issue update fields", () => {
    const merged = mergeIssueUpdates({ title: "A" }, { stateId: "state-1", priority: 2 });
    expect(merged).toEqual({ title: "A", stateId: "state-1", priority: 2 });
  });

  test("merges document update fields", () => {
    const merged = mergeDocumentUpdates({ title: "Doc" }, { content: "body" });
    expect(merged).toEqual({ title: "Doc", content: "body" });
  });

  test("coalesces pending issue updates", () => {
    const existing: StoredMutation = {
      id: "m1",
      status: "pending",
      entityKey: "issue:issue-1",
      createdAt: 1,
      retryCount: 0,
      payload: {
        type: "issue.update",
        payload: { issueId: "issue-1", updates: { title: "Old" } },
      },
    };

    const incoming = {
      type: "issue.update" as const,
      payload: { issueId: "issue-1", updates: { priority: 1 } },
    };

    expect(canCoalesceMutation(existing, incoming)).toBe(true);
    const merged = mergeIntoStoredMutation(existing, incoming);
    expect(merged.payload.payload.updates).toEqual({ title: "Old", priority: 1 });
  });
});
