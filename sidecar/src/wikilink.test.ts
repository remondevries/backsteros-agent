import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  formatWikilinkResolution,
  parseWikilinkTarget,
  resolveWikilink,
} from "./wikilink.ts";

let notesPath = "";

beforeAll(() => {
  notesPath = mkdtempSync(join(tmpdir(), "backster-wikilink-"));
  mkdirSync(join(notesPath, "Daily"), { recursive: true });
  mkdirSync(join(notesPath, "Projects"), { recursive: true });
  mkdirSync(join(notesPath, "archive"), { recursive: true });

  writeFileSync(join(notesPath, "Daily/2026-06-07.md"), "# Daily\n");
  writeFileSync(join(notesPath, "Projects/Alpha.md"), "# Alpha\n");
  writeFileSync(join(notesPath, "Projects/Beta.md"), "# Beta\n");
  writeFileSync(join(notesPath, "archive/Alpha.md"), "# Archived Alpha\n");
  writeFileSync(join(notesPath, "Standalone Note.md"), "# Standalone\n");
});

afterAll(() => {
  rmSync(notesPath, { recursive: true, force: true });
});

describe("parseWikilinkTarget", () => {
  test("parses plain target", () => {
    expect(parseWikilinkTarget("Daily/2026-06-07")).toEqual({
      target: "Daily/2026-06-07",
    });
  });

  test("parses alias and heading", () => {
    expect(parseWikilinkTarget("Project Alpha#Goals|Alpha")).toEqual({
      target: "Project Alpha",
      alias: "Alpha",
      heading: "Goals",
    });
  });
});

describe("resolveWikilink", () => {
  test("resolves path-based links", () => {
    expect(resolveWikilink(notesPath, "Daily/2026-06-07")).toEqual({
      path: "Daily/2026-06-07.md",
    });
    expect(resolveWikilink(notesPath, "Daily/2026-06-07.md")).toEqual({
      path: "Daily/2026-06-07.md",
    });
  });

  test("resolves title-based links and excludes archive", () => {
    expect(resolveWikilink(notesPath, "Alpha")).toEqual({
      path: "Projects/Alpha.md",
    });
    expect(resolveWikilink(notesPath, "Standalone Note")).toEqual({
      path: "Standalone Note.md",
    });
  });

  test("prefers same-folder matches when from is provided", () => {
    writeFileSync(join(notesPath, "Daily/Quick Note.md"), "# Quick\n");
    expect(resolveWikilink(notesPath, "Quick Note", "Daily/2026-06-07.md")).toEqual({
      path: "Daily/Quick Note.md",
    });
  });

  test("returns heading metadata", () => {
    expect(resolveWikilink(notesPath, "Alpha#Goals")).toEqual({
      path: "Projects/Alpha.md",
      heading: "Goals",
    });
  });

  test("returns ambiguity for duplicate titles", () => {
    mkdirSync(join(notesPath, "Letters"), { recursive: true });
    writeFileSync(join(notesPath, "Letters/Beta.md"), "# Letter Beta\n");
    const result = resolveWikilink(notesPath, "Beta");
    expect("candidates" in result).toBe(true);
    if ("candidates" in result) {
      expect(result.candidates).toEqual(["Letters/Beta.md", "Projects/Beta.md"]);
    }
  });

  test("throws when note is missing", () => {
    expect(() => resolveWikilink(notesPath, "Missing Note")).toThrow(
      "No note found for wikilink: Missing Note",
    );
  });
});

describe("formatWikilinkResolution", () => {
  test("formats resolved and ambiguous results", () => {
    expect(
      formatWikilinkResolution({
        path: "Daily/2026-06-07.md",
        heading: "Goals",
      }),
    ).toBe("path: Daily/2026-06-07.md\nheading: Goals");

    expect(
      formatWikilinkResolution({
        candidates: ["Projects/Alpha.md", "Letters/Alpha.md"],
      }),
    ).toBe("ambiguous: 2 matches\n- Projects/Alpha.md\n- Letters/Alpha.md");
  });
});
