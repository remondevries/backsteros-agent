import { describe, expect, test } from "bun:test";
import {
  findFirstPdfLinkInDocumentContent,
  findFirstPdfUrlInDocumentContent,
  isPdfLinkLabel,
} from "./documentPdfLink";

describe("documentPdfLink", () => {
  test("detects pdf link labels", () => {
    expect(isPdfLinkLabel("Invoice.pdf")).toBe(true);
    expect(isPdfLinkLabel("Annual Report.PDF")).toBe(true);
    expect(isPdfLinkLabel(" Invoice.pdf ")).toBe(true);
    expect(isPdfLinkLabel("Invoice")).toBe(false);
    expect(isPdfLinkLabel("Invoice.pdf.backup")).toBe(false);
  });

  test("finds pdf links by markdown label, not destination url", () => {
    expect(
      findFirstPdfUrlInDocumentContent(
        "[Invoice.pdf](https://example.com/download?id=123) attached.",
      ),
    ).toBe("https://example.com/download?id=123");

    expect(
      findFirstPdfLinkInDocumentContent("[Annual Report.pdf](https://example.com/files/abc)"),
    ).toEqual({
      url: "https://example.com/files/abc",
      label: "Annual Report.pdf",
    });
  });

  test("ignores links whose label does not end with .pdf", () => {
    expect(
      findFirstPdfUrlInDocumentContent("[Invoice](https://example.com/invoice.pdf) attached."),
    ).toBeNull();

    expect(findFirstPdfUrlInDocumentContent("See https://example.com/a.pdf for details.")).toBeNull();
    expect(findFirstPdfUrlInDocumentContent("Link: <https://example.com/scan.pdf>")).toBeNull();
  });

  test("returns the first matching pdf link when multiple are present", () => {
    expect(
      findFirstPdfUrlInDocumentContent(
        "[One.pdf](https://example.com/one) then [Two.pdf](https://example.com/two)",
      ),
    ).toBe("https://example.com/one");
  });
});
