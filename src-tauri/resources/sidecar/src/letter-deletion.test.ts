import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  deleteLetterWrapperWithPdf,
  deleteWorkspaceFile,
  expandLetterDeletionShellCommand,
  isLetterWrapperRelativePath,
  pairedLetterPdfRelativePath,
} from "./letter-deletion.ts";

describe("letter deletion", () => {
  let tempDir = "";

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  test("detects letter wrapper paths", () => {
    expect(isLetterWrapperRelativePath("Letters/2025-06-21 - Belastingdienst.md")).toBe(true);
    expect(isLetterWrapperRelativePath("Letters/foo.pdf")).toBe(false);
    expect(isLetterWrapperRelativePath("Daily/2025-06-21.md")).toBe(false);
  });

  test("pairs pdf path from wrapper basename", () => {
    expect(pairedLetterPdfRelativePath("Letters/2025-06-21 - Belastingdienst.md")).toBe(
      "Letters/2025-06-21 - Belastingdienst.pdf",
    );
  });

  test("deletes wrapper and sibling pdf", () => {
    tempDir = mkdtempSync(join(tmpdir(), "letter-delete-"));
    const lettersDir = join(tempDir, "Letters");
    mkdirSync(lettersDir, { recursive: true });
    writeFileSync(join(lettersDir, "2025-06-21 - Test.md"), "# Letter", "utf8");
    writeFileSync(join(lettersDir, "2025-06-21 - Test.pdf"), "%PDF", "utf8");

    const deleted = deleteLetterWrapperWithPdf(
      tempDir,
      "Letters/2025-06-21 - Test.md",
    );

    expect(deleted).toEqual([
      "Letters/2025-06-21 - Test.md",
      "Letters/2025-06-21 - Test.pdf",
    ]);
    expect(existsSync(join(lettersDir, "2025-06-21 - Test.md"))).toBe(false);
    expect(existsSync(join(lettersDir, "2025-06-21 - Test.pdf"))).toBe(false);
  });

  test("expands shell rm to include paired pdf", () => {
    const command = 'rm "Letters/2025-06-21 - Belastingdienst.md"';
    expect(expandLetterDeletionShellCommand(command)).toBe(
      'rm "Letters/2025-06-21 - Belastingdienst.md" "Letters/2025-06-21 - Belastingdienst.pdf"',
    );
  });

  test("deleteWorkspaceFile removes only one file outside Letters", () => {
    tempDir = mkdtempSync(join(tmpdir(), "letter-delete-"));
    mkdirSync(join(tempDir, "Daily"), { recursive: true });
    writeFileSync(join(tempDir, "Daily/2025-06-21.md"), "# Daily", "utf8");

    const deleted = deleteWorkspaceFile(tempDir, "Daily/2025-06-21.md");
    expect(deleted).toEqual(["Daily/2025-06-21.md"]);
  });
});
