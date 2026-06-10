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
  test("creates letter frontmatter and embed matching Backster OS", () => {
    const content = buildLetterWrapperContent(
      "2026-03-08 - Tax Office.pdf",
      {
        creator: "Jane Doe",
        organization: "Belastingdienst",
        date: "2026-03-08",
        status: "Inbox",
        project: "Administration",
      },
      "Remon de Vries",
    );

    expect(content).toContain("type: letter");
    expect(content).toContain('assigned: "Remon de Vries"');
    expect(content).toContain('organization: "Belastingdienst"');
    expect(content).toContain("status: Inbox");
    expect(content).toContain('date: "2026-03-08"');
    expect(content).toContain('creator: "Jane Doe"');
    expect(content).toContain('project: "Administration"');
    expect(content).toContain("![[2026-03-08 - Tax Office.pdf]]");
  });
});

describe("yamlQuotedString", () => {
  test("escapes quotes and backslashes", () => {
    expect(yamlQuotedString('Say "hello"')).toBe('"Say \\"hello\\""');
  });
});
