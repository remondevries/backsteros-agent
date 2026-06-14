import { describe, expect, test } from "bun:test";
import { buildDeleteFileConfirmToken } from "./deleteFileConfirm.ts";
import {
  detectDeleteFileIntent,
  findActiveDeleteConfirmRunId,
  parseDeleteShortcut,
} from "./deleteFile.ts";

describe("parseDeleteShortcut", () => {
  test("sends body on /delete with text", () => {
    expect(parseDeleteShortcut("/delete Daily/2025-06-10.md")).toEqual({
      kind: "send",
      body: "Daily/2025-06-10.md",
    });
  });

  test("ignores bare /delete and /d", () => {
    expect(parseDeleteShortcut("/delete")).toBeNull();
    expect(parseDeleteShortcut("/d")).toBeNull();
    expect(parseDeleteShortcut("/d Daily/2025-06-10.md")).toBeNull();
  });
});

describe("findActiveDeleteConfirmRunId", () => {
  test("finds pending delete confirm on the user message run", () => {
    const runId = "run-delete-1";
    const confirmText = buildDeleteFileConfirmToken(
      "Inbox/test.md",
      "Do you want me to delete it?",
    );

    expect(
      findActiveDeleteConfirmRunId(
        [{ id: "user-1", role: "user", runId }],
        { [runId]: { status: "finished", text: confirmText } },
        {},
      ),
    ).toBe(runId);
  });

  test("ignores resolved delete confirms", () => {
    const runId = "run-delete-2";
    const confirmText = buildDeleteFileConfirmToken("Inbox/test.md", "Delete it?");

    expect(
      findActiveDeleteConfirmRunId(
        [{ id: "user-2", role: "user", runId }],
        { [runId]: { status: "finished", text: confirmText } },
        { [runId]: { confirmed: false } },
      ),
    ).toBeNull();
  });
});

describe("detectDeleteFileIntent", () => {
  test("detects natural-language delete requests", () => {
    expect(detectDeleteFileIntent("Can you delete this note from my vault?")).toBe(true);
    expect(detectDeleteFileIntent("remove [[Daily/2025-06-10]]")).toBe(true);
  });

  test("ignores slash activation and unrelated text", () => {
    expect(detectDeleteFileIntent("/delete")).toBe(false);
    expect(detectDeleteFileIntent("/delete ")).toBe(false);
    expect(detectDeleteFileIntent("hello there")).toBe(false);
  });
});
