import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("lookup sessions", () => {
  let dataDir = "";

  afterEach(() => {
    if (dataDir) {
      rmSync(dataDir, { recursive: true, force: true });
      dataDir = "";
    }
    delete process.env.BACKSTER_DATA_DIR;
  });

  test("creates, saves, and loads lookup history", async () => {
    dataDir = mkdtempSync(join(tmpdir(), "backster-lookup-sessions-"));
    process.env.BACKSTER_DATA_DIR = dataDir;

    const sessions = await import("./lookup-sessions.ts");
    const record = sessions.createLookupSessionRecord();
    sessions.saveLookupSessionState(record.sessionId, {
      messages: [
        {
          id: "user-1",
          role: "user",
          text: "What is Bun?",
          runId: "run-1",
        },
      ],
      runs: {
        "run-1": {
          runId: "run-1",
          status: "finished",
          steps: [],
          text: "Bun is a JavaScript runtime.",
          entities: [],
          approvals: [],
          expanded: false,
        },
      },
    });

    const history = sessions.loadLookupHistory(record.sessionId);
    expect(history).toEqual([
      { role: "user", parts: [{ text: "What is Bun?" }] },
      { role: "assistant", parts: [{ text: "Bun is a JavaScript runtime." }] },
    ]);
  });
});
