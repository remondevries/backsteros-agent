import { beforeEach, describe, expect, test } from "bun:test";
import type { LinearWatcherChangeEvent } from "./notificationPayloads";
import {
  __resetLinearWatcherActivityLogForTests,
  appendLinearWatcherActivityLog,
  getLinearWatcherActivityLogEntries,
  WATCHER_ACTIVITY_LOG_MAX_ENTRIES,
} from "./linearWatcherActivityLog";

function createWatcherEvent(overrides?: Partial<LinearWatcherChangeEvent>): LinearWatcherChangeEvent {
  return {
    type: "linear.watcher.change",
    projectId: "project-1",
    projectName: "Backster OS",
    issueId: "issue-1",
    identifier: "BOS-1",
    title: "Issue title",
    url: "https://linear.app/issue/BOS-1",
    changeKind: "status_changed",
    summary: "Status changed from Backlog to In Progress",
    detectedAt: "2026-06-13T12:00:00.000Z",
    ...overrides,
  };
}

describe("linearWatcherActivityLog", () => {
  beforeEach(() => {
    __resetLinearWatcherActivityLogForTests();
  });

  test("appends entries and returns newest first", () => {
    appendLinearWatcherActivityLog(
      createWatcherEvent({
        issueId: "issue-1",
        identifier: "BOS-1",
        detectedAt: "2026-06-13T12:00:00.000Z",
      }),
    );
    appendLinearWatcherActivityLog(
      createWatcherEvent({
        issueId: "issue-2",
        identifier: "BOS-2",
        detectedAt: "2026-06-13T12:01:00.000Z",
      }),
    );

    const entries = getLinearWatcherActivityLogEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0]?.identifier).toBe("BOS-2");
    expect(entries[1]?.identifier).toBe("BOS-1");
  });

  test("filters entries by project id", () => {
    appendLinearWatcherActivityLog(
      createWatcherEvent({ projectId: "project-1", identifier: "BOS-1" }),
    );
    appendLinearWatcherActivityLog(
      createWatcherEvent({ projectId: "project-2", identifier: "BOS-2" }),
    );

    const entries = getLinearWatcherActivityLogEntries({ projectId: "project-2" });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.identifier).toBe("BOS-2");
  });

  test("caps the log size at max entries", () => {
    for (let index = 0; index < WATCHER_ACTIVITY_LOG_MAX_ENTRIES + 5; index += 1) {
      appendLinearWatcherActivityLog(
        createWatcherEvent({
          issueId: `issue-${index}`,
          identifier: `BOS-${index}`,
          detectedAt: `2026-06-13T12:${String(index % 60).padStart(2, "0")}:00.000Z`,
        }),
      );
    }

    const entries = getLinearWatcherActivityLogEntries();
    expect(entries).toHaveLength(WATCHER_ACTIVITY_LOG_MAX_ENTRIES);
  });

  test("dedupes identical watcher events", () => {
    const event = createWatcherEvent({
      issueId: "issue-dup",
      identifier: "BOS-dup",
      detectedAt: "2026-06-13T12:05:00.000Z",
    });
    appendLinearWatcherActivityLog(event);
    appendLinearWatcherActivityLog(event);

    const entries = getLinearWatcherActivityLogEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.identifier).toBe("BOS-dup");
  });
});
