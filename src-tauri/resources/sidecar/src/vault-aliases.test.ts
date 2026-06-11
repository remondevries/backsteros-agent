import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendAliasesToNote,
  dedupeAliases,
  parseAliasListFromFrontmatter,
  readAliasesFromNote,
  recordLearnedAliases,
  resolveContactNotePath,
} from "./vault-aliases.ts";

describe("vault aliases", () => {
  let tempDir = "";

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  test("dedupes aliases case-insensitively", () => {
    expect(dedupeAliases(["RNA DE VRIES", "rna de vries", "Remon"])).toEqual([
      "RNA DE VRIES",
      "Remon",
    ]);
  });

  test("reads and appends alias frontmatter while preserving body", () => {
    tempDir = mkdtempSync(join(tmpdir(), "vault-alias-"));
    const notePath = join(tempDir, "Contacts", "Remon de Vries.md");
    mkdirSync(join(tempDir, "Contacts"), { recursive: true });
    writeFileSync(notePath, "# Remon\n", "utf8");

    appendAliasesToNote(notePath, ["RNA DE VRIES"]);
    const content = readFileSync(notePath, "utf8");

    expect(content).toContain("alias:");
    expect(content).toContain("RNA DE VRIES");
    expect(content).toContain("# Remon");
    expect(readAliasesFromNote(notePath)).toEqual(["RNA DE VRIES"]);
  });

  test("records learned aliases after filing", () => {
    tempDir = mkdtempSync(join(tmpdir(), "vault-alias-"));
    const notesPath = tempDir;
    mkdirSync(join(notesPath, "Contacts"), { recursive: true });
    const contactPath = resolveContactNotePath(notesPath, "Remon de Vries");
    writeFileSync(contactPath, "---\n---\n", "utf8");

    recordLearnedAliases({
      notesPath,
      metadata: {
        assigned: "Remon de Vries",
        creator: "",
        organization: "Belastingdienst",
        date: "2025-06-21",
        status: "Inbox",
      },
      matchSources: {
        assigned: "RNA DE VRIES",
        organization: "Belastingdienst",
      },
    });

    expect(readAliasesFromNote(contactPath)).toEqual(["RNA DE VRIES"]);
    expect(existsSync(join(notesPath, "Organizations", "Belastingdienst.md"))).toBe(true);
  });

  test("parses inline and list alias frontmatter", () => {
    expect(
      parseAliasListFromFrontmatter(`---\nalias:\n  - One\n  - Two\n---`),
    ).toEqual(["One", "Two"]);
  });
});
