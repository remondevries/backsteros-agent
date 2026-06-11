import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  respondToPendingDeleteFile,
  setPendingDeleteFile,
} from "./delete-file.ts";

describe("respondToPendingDeleteFile", () => {
  test("returns cancel copy when the user declines", () => {
    const sessionId = "session-1";
    setPendingDeleteFile(sessionId, { path: "Inbox/test.md" });

    expect(respondToPendingDeleteFile("/vault", sessionId, "return")).toEqual({
      response: "I did not delete the note, it's still in the original location.",
    });
  });

  test("returns success copy when the user confirms", () => {
    const notesPath = mkdtempSync(join(tmpdir(), "delete-file-"));
    mkdirSync(join(notesPath, "Inbox"), { recursive: true });
    writeFileSync(join(notesPath, "Inbox/test.md"), "# Test", "utf8");

    const sessionId = "session-2";
    setPendingDeleteFile(sessionId, { path: "Inbox/test.md" });

    const result = respondToPendingDeleteFile(notesPath, sessionId, "confirm");
    expect(result.response).toBe("I have deleted the note.");
    expect(result.deleted).toEqual(["Inbox/test.md"]);
  });
});
