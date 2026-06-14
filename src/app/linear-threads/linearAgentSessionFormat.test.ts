import { describe, expect, test } from "bun:test";
import type { LinearComment } from "../../lib/api";
import {
  DEFAULT_LINEAR_AGENT_STATUS_LABEL,
  pickLinearAgentStatusLabel,
  resolveLinearAgentSessionId,
  sanitizeLinearAgentStatusText,
  type LinearAgentSessionSnapshot,
} from "./linearAgentSessionFormat";

function comment(
  id: string,
  overrides: Partial<LinearComment> = {},
): LinearComment {
  return {
    id,
    body: overrides.body ?? "Hello",
    createdAt: overrides.createdAt ?? "2026-06-13T12:00:00.000Z",
    parentId: overrides.parentId ?? null,
    author: overrides.author ?? { id: "user-1", name: "User", avatarUrl: null },
    agentSessionId: overrides.agentSessionId ?? null,
  };
}

describe("resolveLinearAgentSessionId", () => {
  test("prefers the newest comment in the thread with a session id", () => {
    const comments = [
      comment("thread-1", { agentSessionId: "session-old", createdAt: "2026-06-13T12:00:00.000Z" }),
      comment("reply-1", {
        parentId: "thread-1",
        agentSessionId: "session-new",
        createdAt: "2026-06-13T12:05:00.000Z",
      }),
    ];

    expect(resolveLinearAgentSessionId(comments, "thread-1")).toBe("session-new");
  });
});

describe("sanitizeLinearAgentStatusText", () => {
  test("strips basic markdown and keeps the first line", () => {
    expect(sanitizeLinearAgentStatusText("**Analyzing** the [issue](https://linear.app)")).toBe(
      "Analyzing the issue",
    );
    expect(sanitizeLinearAgentStatusText("Line one\nLine two")).toBe("Line one");
  });
});

describe("pickLinearAgentStatusLabel", () => {
  test("uses the in-progress plan step when available", () => {
    const snapshot: LinearAgentSessionSnapshot = {
      id: "session-1",
      status: "active",
      summary: null,
      plan: [{ content: "Review linked pull request", status: "inProgress" }],
      activities: [],
    };

    expect(pickLinearAgentStatusLabel(snapshot)).toBe("Review linked pull request");
  });

  test("uses the latest in-progress action activity", () => {
    const snapshot: LinearAgentSessionSnapshot = {
      id: "session-1",
      status: "active",
      summary: null,
      plan: [],
      activities: [
        {
          updatedAt: "2026-06-13T12:05:00.000Z",
          ephemeral: true,
          content: {
            type: "action",
            action: "Searching",
            parameter: "repository context",
            result: null,
          },
        },
      ],
    };

    expect(pickLinearAgentStatusLabel(snapshot)).toBe("Searching · repository context");
  });

  test("falls back to the default label", () => {
    expect(pickLinearAgentStatusLabel(null)).toBe(DEFAULT_LINEAR_AGENT_STATUS_LABEL);
  });
});
