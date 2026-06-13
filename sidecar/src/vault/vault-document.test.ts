import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createVaultDocument, readVaultDocument, updateVaultDocument } from "./vault-document.ts";
import {
  ensureDocumentDateFrontmatter,
  readVaultNoteDateFromContent,
} from "./vault-frontmatter.ts";

const tempDirs: string[] = [];

function makeNotesDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "backster-vault-doc-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe("vault-frontmatter", () => {
  test("adds date frontmatter when missing", () => {
    expect(ensureDocumentDateFrontmatter(null, "2026-06-12")).toBe(
      "---\ndate: 2026-06-12\n---",
    );
  });

  test("preserves existing date and other fields", () => {
    const frontmatter = `---
category: Note
date: 2025-01-01
status: Inbox
---`;

    expect(ensureDocumentDateFrontmatter(frontmatter, "2026-06-12")).toBe(frontmatter);
  });

  test("reads date from note content", () => {
    const content = `---
date: 2026-06-12
---

# Hello
`;
    expect(readVaultNoteDateFromContent(content)).toBe("2026-06-12");
  });
});

describe("vault-document", () => {
  test("adds date frontmatter when saving a note without frontmatter", async () => {
    const notesPath = makeNotesDir();
    mkdirSync(join(notesPath, "Inbox"), { recursive: true });
    const relativePath = "Inbox/idea.md";
    writeFileSync(join(notesPath, "Inbox", "idea.md"), "# Idea\n\nSome text\n", "utf8");

    await updateVaultDocument(notesPath, relativePath, { body: "Some text\n\nMore text" });

    const saved = readFileSync(join(notesPath, "Inbox", "idea.md"), "utf8");
    expect(saved.startsWith("---\ndate: ")).toBe(true);
    expect(saved).toContain("Some text");
    expect(saved).toContain("More text");
    expect(readVaultNoteDateFromContent(saved)?.length).toBeGreaterThan(0);
  });

  test("uses the filename for title even when the body starts with h1", () => {
    const notesPath = makeNotesDir();
    mkdirSync(join(notesPath, "Inbox"), { recursive: true });
    writeFileSync(
      join(notesPath, "Inbox", "my-note.md"),
      "# Different heading\n\nBody text\n",
      "utf8",
    );

    const document = readVaultDocument(notesPath, "Inbox/my-note.md");

    expect(document.title).toBe("my-note");
    expect(document.body).toContain("# Different heading");
    expect(document.body).toContain("Body text");
  });

  test("preserves existing frontmatter date on save", async () => {
    const notesPath = makeNotesDir();
    mkdirSync(join(notesPath, "Inbox"), { recursive: true });
    const relativePath = "Inbox/existing.md";
    writeFileSync(
      join(notesPath, "Inbox", "existing.md"),
      "---\ndate: 2025-03-04\n---\n\n# Existing\n\nBody\n",
      "utf8",
    );

    await updateVaultDocument(notesPath, relativePath, { body: "Updated body" });
    const document = readVaultDocument(notesPath, relativePath);

    expect(document.body.trimEnd()).toBe("Updated body");
    expect(document.date).toBe("2025-03-04");
  });

  test("creates a new Untitled note with date frontmatter in a folder", () => {
    const notesPath = makeNotesDir();

    const document = createVaultDocument(notesPath, "Inbox");

    expect(document.path).toBe("Inbox/Untitled.md");
    expect(document.title).toBe("Untitled");
    expect(document.body).toBe("");
    const saved = readFileSync(join(notesPath, "Inbox", "Untitled.md"), "utf8");
    expect(saved.startsWith("---\ndate: ")).toBe(true);
    expect(saved).not.toContain("# Untitled");
  });

  test("creates a unique filename when one already exists", () => {
    const notesPath = makeNotesDir();

    const first = createVaultDocument(notesPath, "Inbox");
    const second = createVaultDocument(notesPath, "Inbox");

    expect(first.path).toBe("Inbox/Untitled.md");
    expect(second.path).toBe("Inbox/Untitled 2.md");
  });

  test("renames the file when the title changes", async () => {
    const notesPath = makeNotesDir();
    mkdirSync(join(notesPath, "Inbox"), { recursive: true });
    const relativePath = "Inbox/Untitled.md";
    writeFileSync(join(notesPath, "Inbox", "Untitled.md"), "# Untitled\n\nBody\n", "utf8");

    const document = await updateVaultDocument(notesPath, relativePath, {
      title: "Untitledtest",
      body: "Body",
    });

    expect(document.path).toBe("Inbox/Untitledtest.md");
    expect(document.title).toBe("Untitledtest");
    expect(existsSync(join(notesPath, "Inbox", "Untitledtest.md"))).toBe(true);
    expect(existsSync(join(notesPath, "Inbox", "Untitled.md"))).toBe(false);
  });

  test("does not rename daily notes when the title changes", async () => {
    const notesPath = makeNotesDir();
    mkdirSync(join(notesPath, "Daily"), { recursive: true });
    const relativePath = "Daily/2026-06-12.md";
    writeFileSync(
      join(notesPath, "Daily", "2026-06-12.md"),
      "---\ndate: 2026-06-12\n---\n\n# Thursday\n",
      "utf8",
    );

    const document = await updateVaultDocument(notesPath, relativePath, {
      title: "New title",
      body: "",
    });

    expect(document.path).toBe("Daily/2026-06-12.md");
    expect(existsSync(join(notesPath, "Daily", "2026-06-12.md"))).toBe(true);
  });

  test("includes whoop stats from frontmatter", () => {
    const notesPath = makeNotesDir();
    mkdirSync(join(notesPath, "Daily"), { recursive: true });
    writeFileSync(
      join(notesPath, "Daily", "2026-06-12.md"),
      "---\ndate: 2026-06-12\nsleep: 84\nrecovery: 71\nstrain: 4.3\n---\n\n## Day log\n",
      "utf8",
    );

    const document = readVaultDocument(notesPath, "Daily/2026-06-12.md");
    expect(document.date).toBe("2026-06-12");
    expect(document.whoop).toEqual({ sleep: 84, recovery: 71, strain: 4.3 });
  });
});
