import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveDeleteTargetFromText } from "./delete-file-resolve.ts";

describe("resolveDeleteTargetFromText", () => {
  let tempDir = "";

  test("finds a note by wikilink title", () => {
    tempDir = mkdtempSync(join(tmpdir(), "delete-resolve-"));
    mkdirSync(join(tempDir, "Daily"), { recursive: true });
    writeFileSync(join(tempDir, "Daily/2025-06-10.md"), "# Daily", "utf8");

    expect(resolveDeleteTargetFromText(tempDir, "delete [[2025-06-10]] from my vault")).toEqual({
      status: "found",
      path: "Daily/2025-06-10.md",
    });
  });

  test("finds a note by relative path", () => {
    tempDir = mkdtempSync(join(tmpdir(), "delete-resolve-"));
    mkdirSync(join(tempDir, "Notes"), { recursive: true });
    writeFileSync(join(tempDir, "Notes/Todo.md"), "# Todo", "utf8");

    expect(resolveDeleteTargetFromText(tempDir, "remove Notes/Todo.md")).toEqual({
      status: "found",
      path: "Notes/Todo.md",
    });
  });

  test("finds a note by basename and folder hint", () => {
    tempDir = mkdtempSync(join(tmpdir(), "delete-resolve-"));
    mkdirSync(join(tempDir, "Inbox"), { recursive: true });
    writeFileSync(join(tempDir, "Inbox/test.md"), "# Test", "utf8");

    expect(
      resolveDeleteTargetFromText(tempDir, "Can you remove the test.md inside my Inbox folder?"),
    ).toEqual({
      status: "found",
      path: "Inbox/test.md",
    });
  });

  test("finds a note when filename is wrapped in backticks", () => {
    tempDir = mkdtempSync(join(tmpdir(), "delete-resolve-"));
    mkdirSync(join(tempDir, "Inbox"), { recursive: true });
    writeFileSync(join(tempDir, "Inbox/test.md"), "# Test", "utf8");

    expect(
      resolveDeleteTargetFromText(tempDir, "Can you remove the `test.md` inside my Inbox folder?"),
    ).toEqual({
      status: "found",
      path: "Inbox/test.md",
    });
  });

  test("returns ambiguous when multiple notes match", () => {
    tempDir = mkdtempSync(join(tmpdir(), "delete-resolve-"));
    mkdirSync(join(tempDir, "A"), { recursive: true });
    mkdirSync(join(tempDir, "B"), { recursive: true });
    writeFileSync(join(tempDir, "A/Project.md"), "# A", "utf8");
    writeFileSync(join(tempDir, "B/Project.md"), "# B", "utf8");

    const result = resolveDeleteTargetFromText(tempDir, "delete Project note");
    expect(result.status).toBe("ambiguous");
    if (result.status === "ambiguous") {
      expect(result.candidates.sort()).toEqual(["A/Project.md", "B/Project.md"]);
    }
  });

  test("finds a note when the filename contains spaces", () => {
    tempDir = mkdtempSync(join(tmpdir(), "delete-resolve-"));
    mkdirSync(join(tempDir, "Inbox"), { recursive: true });
    writeFileSync(join(tempDir, "Inbox/iOS agent app.md"), "# iOS", "utf8");

    expect(
      resolveDeleteTargetFromText(tempDir, "can you delete `iOS agent app.md` in Inbox folder?"),
    ).toEqual({
      status: "found",
      path: "Inbox/iOS agent app.md",
    });
  });

  test("finds a note from a follow-up title mention", () => {
    tempDir = mkdtempSync(join(tmpdir(), "delete-resolve-"));
    mkdirSync(join(tempDir, "Projects"), { recursive: true });
    writeFileSync(join(tempDir, "Projects/Concept For Agency.md"), "# Concept", "utf8");

    expect(resolveDeleteTargetFromText(tempDir, "what about `Concept For Agency.md`")).toEqual({
      status: "found",
      path: "Projects/Concept For Agency.md",
    });
  });

  test("finds a note by title without extension", () => {
    tempDir = mkdtempSync(join(tmpdir(), "delete-resolve-"));
    mkdirSync(join(tempDir, "Inbox"), { recursive: true });
    writeFileSync(join(tempDir, "Inbox/Concept For Agency.md"), "# Concept", "utf8");

    expect(
      resolveDeleteTargetFromText(tempDir, "what about Concept For Agency in Inbox folder"),
    ).toEqual({
      status: "found",
      path: "Inbox/Concept For Agency.md",
    });
  });

  test("collapses case-insensitive folder duplicates to the vault path", () => {
    tempDir = mkdtempSync(join(tmpdir(), "delete-resolve-"));
    mkdirSync(join(tempDir, "Inbox"), { recursive: true });
    writeFileSync(join(tempDir, "Inbox/test.md"), "# Test", "utf8");

    expect(resolveDeleteTargetFromText(tempDir, "can you remove test.md in inbox?")).toEqual({
      status: "found",
      path: "Inbox/test.md",
    });
  });

  test("ignores .obsidian when resolving basename with folder hint", () => {
    tempDir = mkdtempSync(join(tmpdir(), "delete-resolve-"));
    mkdirSync(join(tempDir, "Inbox"), { recursive: true });
    mkdirSync(join(tempDir, ".obsidian/plugins/backster-os/node_modules/eval"), { recursive: true });
    writeFileSync(join(tempDir, "Inbox/test.md"), "# Test", "utf8");
    writeFileSync(join(tempDir, ".obsidian/plugins/backster-os/node_modules/eval/test.js"), "", "utf8");

    expect(
      resolveDeleteTargetFromText(tempDir, "Can you remove the test.md inside my Inbox folder?"),
    ).toEqual({
      status: "found",
      path: "Inbox/test.md",
    });
  });
});
