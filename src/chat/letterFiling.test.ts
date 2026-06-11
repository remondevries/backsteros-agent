import { describe, expect, test } from "bun:test";
import { createLetterFilingDraft, isPdfAttachmentFile } from "./letterFiling";

describe("letterFiling helpers", () => {
  test("prefills draft from analysis and vault options", () => {
    const draft = createLetterFilingDraft(
      {
        creator: "Jane Doe",
        organization: "Acme Corp",
        receivedDate: "2026-03-08",
        subject: "Invoice",
        summary: "Monthly invoice",
      },
      {
        contacts: ["Jane Doe", "John Smith"],
        organizations: ["Acme Corp"],
        projects: ["Taxes"],
        statuses: ["Inbox", "In Progress", "On Hold", "Archive"],
      },
    );

    expect(draft.assigned).toBe("Jane Doe");
    expect(draft.organization).toBe("Acme Corp");
    expect(draft.received).toBe("2026-03-08");
    expect(draft.note).toBe("Invoice");
  });

  test("keeps extracted organization when it is not in vault options", () => {
    const draft = createLetterFilingDraft(
      {
        creator: "",
        organization: "Belastingdienst",
        receivedDate: "2025-06-21",
        subject: "Dwangbevel",
        summary: "Barcode noise",
      },
      {
        contacts: [],
        organizations: ["Gemeente Leeuwarden"],
        projects: [],
        statuses: ["Inbox", "In Progress", "On Hold", "Archive"],
      },
    );

    expect(draft.organization).toBe("Belastingdienst");
    expect(draft.note).toBe("Dwangbevel");
  });

  test("detects pdf files", () => {
    expect(isPdfAttachmentFile(new File(["x"], "letter.pdf", { type: "application/pdf" }))).toBe(
      true,
    );
    expect(isPdfAttachmentFile(new File(["x"], "notes.txt", { type: "text/plain" }))).toBe(false);
  });
});
