import { afterEach, describe, expect, mock, test } from "bun:test";
import {
  fetchIssuesCompletedToday,
  fetchIssuesDueToday,
  morningReviewLinearContext,
  resolveMorningReviewDueDate,
} from "./morning-review-linear.ts";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.LINEAR_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) {
    delete process.env.LINEAR_API_KEY;
  } else {
    process.env.LINEAR_API_KEY = originalApiKey;
  }
});

describe("resolveMorningReviewDueDate", () => {
  test("formats date in the provided timezone", () => {
    const date = resolveMorningReviewDueDate(
      "Europe/Amsterdam",
      new Date("2026-06-08T22:30:00.000Z"),
    );
    expect(date).toBe("2026-06-09");
  });
});

describe("morningReviewLinearContext", () => {
  test("tells the agent not to re-fetch Linear", () => {
    const context = morningReviewLinearContext(3, "2026-06-09");
    expect(context).toContain("3 issue(s) due 2026-06-09");
    expect(context).toContain("Do not call Linear MCP");
  });
});

describe("fetchIssuesDueToday", () => {
  test("returns parsed open issues due today", async () => {
    process.env.LINEAR_API_KEY = "test-key";

    globalThis.fetch = mock(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {
        variables: { dueDate: string; after?: string | null };
      };

      expect(body.variables.dueDate).toBe("2026-06-09");

      return new Response(
        JSON.stringify({
          data: {
            issues: {
              nodes: [
                {
                  id: "issue-1",
                  identifier: "BAC-101",
                  title: "Ship morning review",
                  priority: 2,
                  dueDate: "2026-06-09",
                  url: "https://linear.app/issue/BAC-101",
                  state: { name: "In Progress", type: "started", color: "#f2c94c" },
                  assignee: {
                    id: "user-1",
                    displayName: "Remon",
                    avatarUrl: "https://example.com/a.png",
                  },
                  project: { name: "Backster" },
                },
                {
                  id: "issue-2",
                  identifier: "BAC-102",
                  title: "Done task",
                  dueDate: "2026-06-09",
                  state: { name: "Done", type: "completed", color: "#4cb782" },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const issues = await fetchIssuesDueToday({
      timezone: "Europe/Amsterdam",
      now: new Date("2026-06-08T22:30:00.000Z"),
    });

    expect(issues.map((issue) => issue.identifier)).toEqual(["BAC-101"]);
    expect(issues[0]?.status).toBe("In Progress");
    expect(issues[0]?.dueDate).toBe("2026-06-09");
    expect(issues[0]?.projectName).toBe("Backster");
  });

  test("paginates until all pages are fetched", async () => {
    process.env.LINEAR_API_KEY = "test-key";
    let callCount = 0;

    globalThis.fetch = mock(async (_input, init) => {
      callCount += 1;
      const body = JSON.parse(String(init?.body)) as {
        variables: { after?: string | null };
      };

      if (!body.variables.after) {
        return new Response(
          JSON.stringify({
            data: {
              issues: {
                nodes: [
                  {
                    id: "issue-1",
                    identifier: "BAC-1",
                    title: "First page",
                    state: { name: "Todo", type: "unstarted" },
                  },
                ],
                pageInfo: { hasNextPage: true, endCursor: "cursor-1" },
              },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      expect(body.variables.after).toBe("cursor-1");

      return new Response(
        JSON.stringify({
          data: {
            issues: {
              nodes: [
                {
                  id: "issue-2",
                  identifier: "BAC-2",
                  title: "Second page",
                  state: { name: "In Progress", type: "started" },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const issues = await fetchIssuesDueToday({
      timezone: "UTC",
      now: new Date("2026-06-09T12:00:00.000Z"),
    });

    expect(callCount).toBe(2);
    expect(issues.map((issue) => issue.identifier)).toEqual(["BAC-1", "BAC-2"]);
  });
});

describe("fetchIssuesCompletedToday", () => {
  test("returns issues completed with due date today", async () => {
    process.env.LINEAR_API_KEY = "test-key";

    globalThis.fetch = mock(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {
        variables: { dueDate: string };
      };

      expect(body.variables.dueDate).toBe("2026-06-08");

      return new Response(
        JSON.stringify({
          data: {
            issues: {
              nodes: [
                {
                  id: "issue-1",
                  identifier: "BAC-201",
                  title: "Ship good night",
                  dueDate: "2026-06-08",
                  state: { name: "Done", type: "completed" },
                },
                {
                  id: "issue-2",
                  identifier: "BAC-202",
                  title: "Still open",
                  dueDate: "2026-06-08",
                  state: { name: "In Progress", type: "started" },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const result = await fetchIssuesCompletedToday({
      timezone: "UTC",
      now: new Date("2026-06-08T20:00:00.000Z"),
    });

    expect(result.count).toBe(1);
    expect(result.issues[0]?.identifier).toBe("BAC-201");
    expect(result.issues[0]?.dueDate).toBe("2026-06-08");
  });
});
