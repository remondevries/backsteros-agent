import { describe, expect, test } from "bun:test";
import type { LinearWatcherChangeEvent } from "./notificationPayloads";
import {
  buildIssueDispatchKey,
  shouldDispatchAgentForWatcherChange,
  statusMatchesDispatchList,
} from "./linearIssueAgentDispatch";

function changeEvent(
  partial: Partial<LinearWatcherChangeEvent> &
    Pick<
      LinearWatcherChangeEvent,
      "projectId" | "issueId" | "identifier" | "title" | "changeKind"
    >,
): LinearWatcherChangeEvent {
  return {
    type: "linear.watcher.change",
    projectName: partial.projectName ?? "Backster OS",
    url: partial.url ?? "https://linear.app/issue/BOS-1",
    summary: partial.summary ?? "Status changed",
    detectedAt: partial.detectedAt ?? "2026-06-13T12:00:00.000Z",
    ...partial,
  };
}

describe("statusMatchesDispatchList", () => {
  test("matches case-insensitively", () => {
    expect(statusMatchesDispatchList("In Progress", ["in progress"])).toBe(true);
    expect(statusMatchesDispatchList("Done", ["In Progress"])).toBe(false);
  });
});

describe("shouldDispatchAgentForWatcherChange", () => {
  const baseConfig = {
    enabled: true,
    pollIntervalMs: 30_000,
    statusChangesOnly: true,
    autoDispatchAgents: true,
    dispatchStatuses: ["In Progress"],
  };

  test("requires watcher and auto-dispatch enabled", () => {
    const event = changeEvent({
      projectId: "proj-1",
      issueId: "issue-1",
      identifier: "BOS-1",
      title: "Test",
      changeKind: "status_changed",
      previousStatus: "Backlog",
      currentStatus: "In Progress",
    });

    expect(
      shouldDispatchAgentForWatcherChange(event, {
        ...baseConfig,
        enabled: false,
      }),
    ).toBe(false);
    expect(
      shouldDispatchAgentForWatcherChange(event, {
        ...baseConfig,
        autoDispatchAgents: false,
      }),
    ).toBe(false);
  });

  test("dispatches when entering a configured status", () => {
    const event = changeEvent({
      projectId: "proj-1",
      issueId: "issue-1",
      identifier: "BOS-1",
      title: "Test",
      changeKind: "status_changed",
      previousStatus: "Backlog",
      currentStatus: "In Progress",
    });

    expect(shouldDispatchAgentForWatcherChange(event, baseConfig)).toBe(true);
  });

  test("does not dispatch when already in configured status", () => {
    const event = changeEvent({
      projectId: "proj-1",
      issueId: "issue-1",
      identifier: "BOS-1",
      title: "Test",
      changeKind: "status_changed",
      previousStatus: "In Progress",
      currentStatus: "In Progress",
    });

    expect(shouldDispatchAgentForWatcherChange(event, baseConfig)).toBe(false);
  });

  test("dispatches for newly created issues in configured status", () => {
    const event = changeEvent({
      projectId: "proj-1",
      issueId: "issue-1",
      identifier: "BOS-1",
      title: "Test",
      changeKind: "issue_created",
      currentStatus: "In Progress",
    });

    expect(shouldDispatchAgentForWatcherChange(event, baseConfig)).toBe(true);
  });

  test("ignores non-status changes", () => {
    const event = changeEvent({
      projectId: "proj-1",
      issueId: "issue-1",
      identifier: "BOS-1",
      title: "Test",
      changeKind: "priority_changed",
      currentStatus: "In Progress",
    });

    expect(shouldDispatchAgentForWatcherChange(event, baseConfig)).toBe(false);
  });
});

describe("buildIssueDispatchKey", () => {
  test("keys by issue and normalized status", () => {
    expect(buildIssueDispatchKey("issue-1", "In Progress")).toBe(
      "issue-1:in progress",
    );
  });
});
