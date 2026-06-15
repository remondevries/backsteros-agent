import { describe, expect, test } from "bun:test";
import {
  buildLetterDocumentLeadingLine,
  buildLinearLinkedDocumentTitle,
  displayTitleFromUploadFilename,
} from "./linked-document-title.ts";

describe("linked-document-title", () => {
  test("builds linked document title from issue identifier", () => {
    expect(buildLinearLinkedDocumentTitle("QM-42", "Tax notice")).toBe("QM-42 - Tax notice");
  });

  test("derives display title from upload filename", () => {
    expect(displayTitleFromUploadFilename("2026-03-08 - Belastingdienst.pdf")).toBe(
      "2026-03-08 - Belastingdienst",
    );
  });

  test("builds leading markdown attachment line", () => {
    expect(buildLetterDocumentLeadingLine("letter.pdf", "https://uploads.linear.app/x")).toBe(
      "[letter.pdf](https://uploads.linear.app/x)\n\n",
    );
  });
});
