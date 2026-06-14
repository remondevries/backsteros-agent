import { describe, expect, test } from "bun:test";
import type { LinearComment } from "../../lib/api";
import {
  buildLinearThreadRootBodyForSave,
  findNewSubstantiveLinearAgentCommentIds,
  hasSubstantiveLinearAgentReply,
  isLinearAgentThinkingPlaceholder,
  linearThreadRootBodyForEditing,
  linearThreadCommentsToChatMessages,
  mergeLinearThreadComments,
  resolveLinearThreadReplyParentId,
  snapshotSubstantiveLinearAgentCommentIds,
} from "./linearThreadFormat";

function agentComment(id: string, body: string): LinearComment {
  return {
    id,
    body,
    createdAt: "2026-06-13T12:00:00.000Z",
    parentId: "thread-1",
    agentSessionId: null,
    author: { id: "linear-agent", name: "Linear", avatarUrl: null },
  };
}

describe("isLinearAgentThinkingPlaceholder", () => {
  test("matches common thinking placeholders", () => {
    expect(isLinearAgentThinkingPlaceholder("Thinking...")).toBe(true);
    expect(isLinearAgentThinkingPlaceholder("Thinking…")).toBe(true);
    expect(isLinearAgentThinkingPlaceholder(" thinking ")).toBe(true);
  });

  test("rejects substantive replies", () => {
    expect(isLinearAgentThinkingPlaceholder("Updated the issue title.")).toBe(false);
  });
});

describe("hasSubstantiveLinearAgentReply", () => {
  test("detects a new substantive agent comment", () => {
    const comments = [agentComment("reply-1", "Here is the answer.")];
    expect(hasSubstantiveLinearAgentReply(comments, "viewer-1", new Set())).toBe(true);
  });

  test("ignores thinking placeholders", () => {
    const comments = [agentComment("reply-1", "Thinking...")];
    expect(hasSubstantiveLinearAgentReply(comments, "viewer-1", new Set())).toBe(false);
  });

  test("detects when a thinking placeholder upgrades in place", () => {
    const baseline = snapshotSubstantiveLinearAgentCommentIds(
      [agentComment("reply-1", "Thinking...")],
      "viewer-1",
    );
    const comments = [agentComment("reply-1", "Here is the answer.")];
    expect(hasSubstantiveLinearAgentReply(comments, "viewer-1", baseline)).toBe(true);
  });
});

describe("buildLinearThreadRootBodyForSave", () => {
  test("preserves @linear prefix for agent threads", () => {
    expect(buildLinearThreadRootBodyForSave("@linear Review this", "Updated prompt")).toBe(
      "@linear Updated prompt",
    );
  });

  test("leaves non-agent thread bodies unchanged", () => {
    expect(buildLinearThreadRootBodyForSave("Plain thread", "Updated text")).toBe("Updated text");
  });
});

describe("linearThreadRootBodyForEditing", () => {
  test("strips @linear prefix for editing", () => {
    expect(linearThreadRootBodyForEditing("@linear Do the thing")).toBe("Do the thing");
  });
});

describe("resolveLinearThreadReplyParentId", () => {
  test("uses the root when it is the only comment", () => {
    expect(
      resolveLinearThreadReplyParentId([{ id: "thread-1", parentId: null }], "thread-1"),
    ).toBe("thread-1");
  });

  test("uses the thread root when nested replies exist", () => {
    expect(
      resolveLinearThreadReplyParentId(
        [
          { id: "thread-1", parentId: null },
          { id: "reply-1", parentId: "thread-1" },
          { id: "reply-2", parentId: "thread-1" },
        ],
        "thread-1",
      ),
    ).toBe("thread-1");
  });

  test("falls back to thread id when no comments are loaded", () => {
    expect(resolveLinearThreadReplyParentId([], "thread-1")).toBe("thread-1");
  });
});

describe("mergeLinearThreadComments", () => {
  test("inserts a new comment in createdAt order", () => {
    const merged = mergeLinearThreadComments(
      [
        {
          id: "thread-1",
          body: "@linear Start",
          createdAt: "2026-06-13T12:00:00.000Z",
          parentId: null,
          agentSessionId: null,
          author: { id: "viewer-1", name: "You", avatarUrl: null },
        },
      ],
      {
        id: "reply-1",
        body: "Follow up",
        createdAt: "2026-06-13T12:00:01.000Z",
        parentId: "thread-1",
        agentSessionId: null,
        author: { id: "viewer-1", name: "You", avatarUrl: null },
      },
    );

    expect(merged.map((comment) => comment.id)).toEqual(["thread-1", "reply-1"]);
  });
});

describe("linearThreadCommentsToChatMessages", () => {
  test("includes the thread root and hides thinking placeholders", () => {
    const messages = linearThreadCommentsToChatMessages(
      [
        {
          id: "thread-1",
          body: "@linear Start here",
          createdAt: "2026-06-13T12:00:00.000Z",
          parentId: null,
          agentSessionId: null,
          author: { id: "viewer-1", name: "You", avatarUrl: null },
        },
        agentComment("reply-1", "Thinking..."),
        agentComment("reply-2", "Done."),
      ],
      "thread-1",
      "viewer-1",
    );

    expect(messages).toEqual([
      expect.objectContaining({ id: "thread-1", role: "user", text: "Start here" }),
      expect.objectContaining({ id: "reply-2", role: "assistant", text: "Done." }),
    ]);
  });

  test("sorts user messages before later assistant replies", () => {
    const messages = linearThreadCommentsToChatMessages(
      [
        {
          ...agentComment("reply-2", "Done."),
          createdAt: "2026-06-13T12:00:02.000Z",
        },
        {
          id: "thread-1",
          body: "@linear Start here",
          createdAt: "2026-06-13T12:00:00.000Z",
          parentId: null,
          agentSessionId: null,
          author: { id: "viewer-1", name: "You", avatarUrl: null },
        },
      ],
      "thread-1",
      "viewer-1",
    );

    expect(messages.map((message) => message.id)).toEqual(["thread-1", "reply-2"]);
  });
});

describe("findNewSubstantiveLinearAgentCommentIds", () => {
  test("returns ids for new substantive agent comments", () => {
    const comments = [agentComment("reply-1", "Here is the answer.")];
    expect(findNewSubstantiveLinearAgentCommentIds(comments, "viewer-1", new Set())).toEqual([
      "reply-1",
    ]);
  });

  test("returns empty when only thinking placeholders are present", () => {
    const comments = [agentComment("reply-1", "Thinking...")];
    expect(findNewSubstantiveLinearAgentCommentIds(comments, "viewer-1", new Set())).toEqual([]);
  });
});
