import { describe, expect, test } from "bun:test";
import {
  computeWatcherBackoffDelay,
  diffWatcherSnapshots,
  normalizeLinearProjectWatcherConfig,
  type WatcherIssueSnapshot,
} from "./watcher-orchestrator.ts";

function issue(partial: Partial<WatcherIssueSnapshot> & Pick<WatcherIssueSnapshot, "id">): WatcherIssueSnapshot {
  return {
    id: partial.id,
    identifier: partial.identifier ?? partial.id,
    title: partial.title ?? "Issue title",
    status: partial.status ?? "Backlog",
    stateId: partial.stateId ?? "state-1",
    priority: partial.priority ?? 0,
    assigneeName: partial.assigneeName ?? null,
    updatedAt: partial.updatedAt ?? "2026-01-01T00:00:00.000Z",
    url: partial.url ?? "https://linear.app/issue/ABC-1",
  };
}

describe("normalizeLinearProjectWatcherConfig", () => {
  test("applies defaults", () => {
    expect(normalizeLinearProjectWatcherConfig(undefined)).toEqual({
      enabled: false,
      pollIntervalMs: 30_000,
      statusChangesOnly: true,
      projectName: undefined,
    });
  });

  test("clamps poll interval to supported range", () => {
    expect(
      normalizeLinearProjectWatcherConfig({ pollIntervalMs: 5_000 }).pollIntervalMs,
    ).toBe(15_000);
    expect(
      normalizeLinearProjectWatcherConfig({ pollIntervalMs: 120_000 }).pollIntervalMs,
    ).toBe(60_000);
  });
});

describe("computeWatcherBackoffDelay", () => {
  test("uses exponential backoff capped at five minutes", () => {
    expect(computeWatcherBackoffDelay(1)).toBe(10_000);
    expect(computeWatcherBackoffDelay(2)).toBe(20_000);
    expect(computeWatcherBackoffDelay(6)).toBe(300_000);
  });
});

describe("diffWatcherSnapshots", () => {
  test("detects newly created issues", () => {
    const previous = new Map<string, WatcherIssueSnapshot>();
    const current = [issue({ id: "1", identifier: "ABC-1" })];

    const diffs = diffWatcherSnapshots(previous, current, { statusChangesOnly: true });
    expect(diffs).toHaveLength(1);
    expect(diffs[0]?.changeKind).toBe("issue_created");
  });

  test("detects status changes when statusChangesOnly is enabled", () => {
    const previous = new Map([
      ["1", issue({ id: "1", status: "Backlog", stateId: "s1" })],
    ]);
    const current = [issue({ id: "1", status: "In Progress", stateId: "s2" })];

    const diffs = diffWatcherSnapshots(previous, current, { statusChangesOnly: true });
    expect(diffs).toHaveLength(1);
    expect(diffs[0]?.changeKind).toBe("status_changed");
  });

  test("ignores assignee changes when statusChangesOnly is enabled", () => {
    const previous = new Map([
      ["1", issue({ id: "1", assigneeName: "Alex" })],
    ]);
    const current = [issue({ id: "1", assigneeName: "Sam" })];

    const diffs = diffWatcherSnapshots(previous, current, { statusChangesOnly: true });
    expect(diffs).toHaveLength(0);
  });

  test("detects assignee and title changes when statusChangesOnly is disabled", () => {
    const previous = new Map([
      ["1", issue({ id: "1", assigneeName: "Alex", title: "Old title" })],
    ]);
    const current = [issue({ id: "1", assigneeName: "Sam", title: "New title" })];

    const diffs = diffWatcherSnapshots(previous, current, { statusChangesOnly: false });
    expect(diffs.map((entry) => entry.changeKind)).toEqual([
      "assignee_changed",
      "title_changed",
    ]);
  });
});
