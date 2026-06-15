import { describe, expect, test } from "bun:test";
import {
  buildLetterDocumentLeadingLine,
  hasLeadingAttachmentLine,
  stripLeadingAttachmentLineFromContent,
} from "./letterDocumentContent.ts";

describe("letterDocumentContent", () => {
  test("builds and detects leading attachment line", () => {
    const line = buildLetterDocumentLeadingLine("letter.pdf", "https://uploads.linear.app/x");
    expect(hasLeadingAttachmentLine(line)).toBe(true);
    expect(stripLeadingAttachmentLineFromContent(`${line}Notes here`)).toBe("Notes here");
  });
});
