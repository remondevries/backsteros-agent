import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  ensureLinearWorkspaceVaultStructure,
  LINEAR_WORKSPACE_VAULT_SECTIONS,
} from "./linear-workspace-vault-structure.ts";

const tempDirs: string[] = [];

function makeNotesDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "backster-linear-vault-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe("ensureLinearWorkspaceVaultStructure", () => {
  test("creates team folders under Letters, Meetings, and Organizations", async () => {
    const notesPath = makeNotesDir();
    const teamId = "11111111-1111-4111-8111-111111111111";

    const created = await ensureLinearWorkspaceVaultStructure(notesPath, { teamId });

    expect(created.sort()).toEqual(
      LINEAR_WORKSPACE_VAULT_SECTIONS.map((section) => `${section}/${teamId}`).sort(),
    );

    for (const section of LINEAR_WORKSPACE_VAULT_SECTIONS) {
      expect(existsSync(join(notesPath, section, teamId))).toBe(true);
    }
  });

  test("creates nested project folders when projectId is provided", async () => {
    const notesPath = makeNotesDir();
    const teamId = "11111111-1111-4111-8111-111111111111";
    const projectId = "22222222-2222-4222-8222-222222222222";

    await ensureLinearWorkspaceVaultStructure(notesPath, { teamId, projectId });

    for (const section of LINEAR_WORKSPACE_VAULT_SECTIONS) {
      expect(existsSync(join(notesPath, section, teamId, projectId))).toBe(true);
    }
  });
});
