import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { augmentUserMessage } from "./prompt.ts";

let dataDir = "";
let previousDataDir: string | undefined;

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), "backster-prompt-"));
  previousDataDir = process.env.BACKSTER_DATA_DIR;
  process.env.BACKSTER_DATA_DIR = dataDir;

  mkdirSync(dataDir, { recursive: true });
  writeFileSync(
    join(dataDir, "profile.md"),
    `# User profile

- Name: Test User
- Timezone: UTC
`,
    "utf8",
  );
  writeFileSync(
    join(dataDir, "agent.md"),
    `# Agent

- Name: Backster
`,
    "utf8",
  );
});

afterAll(() => {
  if (previousDataDir === undefined) {
    delete process.env.BACKSTER_DATA_DIR;
  } else {
    process.env.BACKSTER_DATA_DIR = previousDataDir;
  }
  rmSync(dataDir, { recursive: true, force: true });
});

describe("augmentUserMessage", () => {
  test("prepends system context in agent, user, now order before user text", () => {
    const message = augmentUserMessage(
      { role: "user", text: "Hello" },
      { obsidian: false, linear: false, calendar: false, whoop: false },
      "/tmp/notes",
    );

    const text = message.text ?? "";
    expect(text).toContain("[System:");
    expect(text).toContain("[Agent]");
    expect(text).toContain("[User]");
    expect(text).toContain("[Now]");
    expect(text.indexOf("[Agent]")).toBeLessThan(text.indexOf("[User]"));
    expect(text.indexOf("[User]")).toBeLessThan(text.indexOf("[Now]"));
    expect(text.indexOf("[Now]")).toBeLessThan(text.indexOf("Hello"));
    expect(text).toMatch(/\n\nHello$/);
  });

  test("includes obsidian paths when obsidian tools are active", () => {
    const message = augmentUserMessage(
      { role: "user", text: "Search my notes" },
      { obsidian: true, linear: false, calendar: false, whoop: false },
      "/tmp/vault",
      "MyVault",
    );

    expect(message.text).toContain("[Obsidian paths]");
    expect(message.text).toContain("/tmp/vault");
    expect(message.text).toContain("MyVault");
  });
});
