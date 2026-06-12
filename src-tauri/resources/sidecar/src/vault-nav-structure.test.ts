import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  ensureVaultNavFolders,
  listVaultDirectoryEntries,
  VAULT_NAV_FOLDER_NAMES,
} from "./vault-nav-structure.ts";

const tempDirs: string[] = [];

function makeNotesDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "backster-vault-nav-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe("vault-nav-structure", () => {
  test("creates missing navigation folders", () => {
    const notesPath = makeNotesDir();
    mkdirSync(join(notesPath, "Inbox"));

    const created = ensureVaultNavFolders(notesPath);
    expect(created).not.toContain("Inbox");
    expect(created.length).toBe(VAULT_NAV_FOLDER_NAMES.length - 1);

    for (const folderName of VAULT_NAV_FOLDER_NAMES) {
      expect(existsSync(join(notesPath, folderName))).toBe(true);
    }
  });

  test("lists files and folders for a navigation directory", () => {
    const notesPath = makeNotesDir();
    ensureVaultNavFolders(notesPath);
    mkdirSync(join(notesPath, "Letters", "Archive"));
    writeFileSync(join(notesPath, "Letters", "welcome.md"), "# Hello");

    const entries = listVaultDirectoryEntries(notesPath, "Letters");
    expect(entries.map((entry) => `${entry.kind}:${entry.name}`)).toEqual([
      "directory:Archive",
      "file:welcome.md",
    ]);
  });

  test("rejects paths outside navigation folders", () => {
    const notesPath = makeNotesDir();
    ensureVaultNavFolders(notesPath);
    expect(() => listVaultDirectoryEntries(notesPath, "Projects")).toThrow(
      "local vault navigation folder",
    );
  });
});
