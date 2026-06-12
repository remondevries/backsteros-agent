import { describe, expect, test } from "bun:test";
import { formatVaultNoteDisplayName } from "./vaultNoteDisplayName";

describe("formatVaultNoteDisplayName", () => {
  test("strips .md extension case-insensitively", () => {
    expect(formatVaultNoteDisplayName("Daily note.md")).toBe("Daily note");
    expect(formatVaultNoteDisplayName("README.MD")).toBe("README");
  });

  test("leaves names without .md unchanged", () => {
    expect(formatVaultNoteDisplayName("Inbox")).toBe("Inbox");
    expect(formatVaultNoteDisplayName("report.pdf")).toBe("report.pdf");
  });
});
