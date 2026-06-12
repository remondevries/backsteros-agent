import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  normalizeWhoopLookupDate,
  readWhoopStatsFromContent,
  resolveVaultNoteDate,
  resolveVaultNoteWhoopStats,
} from "./vault-whoop-stats.ts";

describe("vault-whoop-stats", () => {
  test("normalizes lookup dates to YYYY-MM-DD", () => {
    expect(normalizeWhoopLookupDate("2026-06-12")).toBe("2026-06-12");
    expect(normalizeWhoopLookupDate("2026-06-12T14:30:00")).toBe("2026-06-12");
    expect(normalizeWhoopLookupDate('"2026-06-12"')).toBe("2026-06-12");
  });

  test("reads whoop metrics from note frontmatter", () => {
    const content = `---
date: 2026-06-12
sleep: 84
recovery: 71
strain: 4.3
---

# Note
`;
    expect(readWhoopStatsFromContent(content)).toEqual({
      sleep: 84,
      recovery: 71,
      strain: 4.3,
    });
  });

  test("does not attach daily whoop stats to non-daily notes", () => {
    const notesPath = mkdtempSync(join(tmpdir(), "backster-vault-whoop-"));
    try {
      mkdirSync(join(notesPath, "Inbox"), { recursive: true });
      mkdirSync(join(notesPath, "Daily"), { recursive: true });

      writeFileSync(
        join(notesPath, "Daily", "2026-06-12.md"),
        "---\ndate: 2026-06-12\nsleep: 90\nrecovery: 80\nstrain: 5.1\n---\n\n## Day log\n",
        "utf8",
      );
      writeFileSync(
        join(notesPath, "Inbox", "idea.md"),
        "---\ndate: 2026-06-12\n---\n\n# Idea\n",
        "utf8",
      );

      expect(resolveVaultNoteDate("Inbox/idea.md", readFileSync(join(notesPath, "Inbox", "idea.md"), "utf8"))).toBe(
        "2026-06-12",
      );
      expect(resolveVaultNoteWhoopStats(notesPath, "Inbox/idea.md")).toEqual({
        date: "2026-06-12",
        whoop: null,
      });
    } finally {
      rmSync(notesPath, { recursive: true, force: true });
    }
  });

  test("falls back to daily note stats for Daily folder notes", () => {
    const notesPath = mkdtempSync(join(tmpdir(), "backster-vault-whoop-"));
    try {
      mkdirSync(join(notesPath, "Daily"), { recursive: true });

      writeFileSync(
        join(notesPath, "Daily", "2026-06-12.md"),
        "---\ndate: 2026-06-12\nsleep: 90\nrecovery: 80\nstrain: 5.1\n---\n\n## Day log\n",
        "utf8",
      );

      expect(resolveVaultNoteWhoopStats(notesPath, "Daily/2026-06-12.md")).toEqual({
        date: "2026-06-12",
        whoop: { sleep: 90, recovery: 80, strain: 5.1 },
      });
    } finally {
      rmSync(notesPath, { recursive: true, force: true });
    }
  });

  test("derives date from Daily note filename", () => {
    const content = "---\n---\n\n## Day log\n";
    expect(resolveVaultNoteDate("Daily/2026-06-08.md", content)).toBe("2026-06-08");
  });
});
