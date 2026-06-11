import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AGENT_KNOWLEDGE_DIR,
  ensureVaultAgentKnowledge,
  listAgentGuideRelativePaths,
  loadVaultAgentKnowledge,
} from "./vault-agent-knowledge.ts";

describe("vault agent knowledge", () => {
  let tempDir = "";

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  test("scaffolds AGENTS.md index and Agent guides", () => {
    tempDir = mkdtempSync(join(tmpdir(), "vault-agent-"));
    ensureVaultAgentKnowledge(tempDir);

    expect(existsSync(join(tempDir, "AGENTS.md"))).toBe(true);
    expect(existsSync(join(tempDir, AGENT_KNOWLEDGE_DIR, "overview.md"))).toBe(true);
    expect(existsSync(join(tempDir, AGENT_KNOWLEDGE_DIR, "letters.md"))).toBe(true);

    const index = readFileSync(join(tempDir, "AGENTS.md"), "utf8");
    expect(index).toContain(`${AGENT_KNOWLEDGE_DIR}/overview.md`);
    expect(index).toContain(`${AGENT_KNOWLEDGE_DIR}/letters.md`);
  });

  test("loads index and all Agent guides for context injection", () => {
    tempDir = mkdtempSync(join(tmpdir(), "vault-agent-"));
    ensureVaultAgentKnowledge(tempDir);

    const guides = listAgentGuideRelativePaths(tempDir);
    expect(guides.length).toBeGreaterThanOrEqual(4);
    expect(guides[0]).toBe(`${AGENT_KNOWLEDGE_DIR}/overview.md`);

    const loaded = loadVaultAgentKnowledge(tempDir);
    expect(loaded).toContain("[Vault index — AGENTS.md]");
    expect(loaded).toContain("[Vault guide — Agent/overview.md]");
    expect(loaded).toContain("Linear team");
  });

  test("does not overwrite existing guides", () => {
    tempDir = mkdtempSync(join(tmpdir(), "vault-agent-"));
    ensureVaultAgentKnowledge(tempDir);

    const guidePath = join(tempDir, AGENT_KNOWLEDGE_DIR, "conventions.md");
    const custom = "# My custom conventions\n\nKeep it simple.";
    Bun.write(guidePath, custom);

    ensureVaultAgentKnowledge(tempDir);
    expect(readFileSync(guidePath, "utf8")).toBe(custom);
  });
});
