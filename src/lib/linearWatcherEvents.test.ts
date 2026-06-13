import { describe, expect, test } from "bun:test";
import {
  isLinearWatcherChangeEvent,
  linearWatcherChangeToNotification,
  type LinearWatcherChangeEvent,
} from "./notificationPayloads";
import { isLinearWatcherPollEvent } from "./linearWatcherEvents";
import { buildNotificationSignature, shouldDedupeNotification } from "./notifications";

describe("linearWatcherChangeToNotification", () => {
  test("maps watcher events to app notifications", () => {
    const event: LinearWatcherChangeEvent = {
      type: "linear.watcher.change",
      projectId: "project-1",
      projectName: "Backster OS",
      issueId: "issue-1",
      identifier: "BOS-70",
      title: "Add notifications",
      url: "https://linear.app/issue/BOS-70",
      changeKind: "status_changed",
      summary: "Status changed from Backlog to In Progress",
      previousStatus: "Backlog",
      currentStatus: "In Progress",
      detectedAt: "2026-06-13T12:00:00.000Z",
    };

    expect(linearWatcherChangeToNotification(event)).toMatchObject({
      title: "BOS-70 updated",
      message: "Status changed from Backlog to In Progress",
      issueId: "issue-1",
      projectId: "project-1",
      url: "https://linear.app/issue/BOS-70",
    });
  });
});

describe("notification dedupe", () => {
  test("dedupes identical notifications within the window", () => {
    const payload = linearWatcherChangeToNotification({
      type: "linear.watcher.change",
      projectId: "project-1",
      projectName: "Backster OS",
      issueId: "issue-1",
      identifier: "BOS-70",
      title: "Add notifications",
      url: "https://linear.app/issue/BOS-70",
      changeKind: "status_changed",
      summary: "Status changed from Backlog to In Progress",
      detectedAt: "2026-06-13T12:00:00.000Z",
    });

    const now = Date.now();
    expect(shouldDedupeNotification(payload, now)).toBe(false);
    expect(shouldDedupeNotification(payload, now + 1000)).toBe(true);
    expect(shouldDedupeNotification(payload, now + 11_000)).toBe(false);
  });

  test("builds stable notification signatures", () => {
    const signature = buildNotificationSignature({
      kind: "info",
      title: "BOS-70 updated",
      message: "Status changed",
      issueId: "issue-1",
      projectId: "project-1",
    });

    expect(signature).toContain("BOS-70 updated");
    expect(signature).toContain("issue-1");
  });
});

describe("isLinearWatcherPollEvent", () => {
  test("recognizes watcher poll events", () => {
    expect(
      isLinearWatcherPollEvent({
        type: "linear.watcher.poll",
        projectId: "project-1",
        pollIntervalMs: 30_000,
        polledAt: "2026-06-13T12:00:00.000Z",
        nextPollAt: "2026-06-13T12:00:30.000Z",
      }),
    ).toBe(true);
    expect(
      isLinearWatcherPollEvent({
        type: "linear.watcher.heartbeat",
        timestamp: "2026-06-13T12:00:00.000Z",
      }),
    ).toBe(false);
  });
});

describe("isLinearWatcherChangeEvent", () => {
  test("recognizes watcher change events", () => {
    expect(
      isLinearWatcherChangeEvent({
        type: "linear.watcher.change",
        projectId: "p1",
        projectName: "Project",
        issueId: "i1",
        identifier: "ABC-1",
        title: "Title",
        url: "https://linear.app/issue/ABC-1",
        changeKind: "updated",
        summary: "Issue updated",
        detectedAt: "2026-06-13T12:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      isLinearWatcherChangeEvent({
        type: "linear.watcher.heartbeat",
        timestamp: "2026-06-13T12:00:00.000Z",
      }),
    ).toBe(false);
  });
});
