import { describe, expect, test } from "bun:test";
import {
  buildLetterWrapperContent,
  resolveLetterStatus,
  yamlQuotedString,
} from "./letter-filing.ts";

describe("resolveLetterStatus", () => {
  test("defaults to Inbox", () => {
    expect(resolveLetterStatus(undefined)).toBe("Inbox");
    expect(resolveLetterStatus("")).toBe("Inbox");
  });

  test("matches canonical status values case-insensitively", () => {
    expect(resolveLetterStatus("in progress")).toBe("In Progress");
    expect(resolveLetterStatus("ARCHIVED")).toBe("Archived");
  });

  test("falls back to Inbox for unknown values", () => {
    expect(resolveLetterStatus("Done")).toBe("Inbox");
  });
});

describe("buildLetterWrapperContent", () => {
  test("creates letter frontmatter in vault field order", () => {
    const content = buildLetterWrapperContent("2026-03-08 - Tax Office.pdf", {
      assigned: "Remon de Vries",
      creator: "Jane Doe",
      organization: "Belastingdienst",
      date: "2026-03-08",
      status: "In Progress",
      project: "Taxes",
      note: "We made a payment agreement for this payment, this is filed away and is in progress and will be finished on 2026-12-03.",
    });

    expect(content).toBe(
      [
        "---",
        "type: letter",
        'assigned: "Remon de Vries"',
        'date: "2026-03-08"',
        'organization: "Belastingdienst"',
        'project: "Taxes"',
        'status: "In Progress"',
        "note: We made a payment agreement for this payment, this is filed away and is in progress and will be finished on 2026-12-03.",
        "---",
        "",
        "![[2026-03-08 - Tax Office.pdf]]",
      ].join("\n"),
    );
    expect(content).not.toContain("creator:");
  });
});

describe("yamlQuotedString", () => {
  test("escapes quotes and backslashes", () => {
    expect(yamlQuotedString('Say "hello"')).toBe('"Say \\"hello\\""');
  });
});
