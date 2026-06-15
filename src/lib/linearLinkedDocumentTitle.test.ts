import { describe, expect, test } from "bun:test";
import {
  buildLinearLinkedDocumentTitle,
  hasLinearLinkedDocumentIssue,
  linearLinkedDocumentDisplayTitle,
  parseLinearLinkedDocumentTitle,
} from "./linearLinkedDocumentTitle";

describe("parseLinearLinkedDocumentTitle", () => {
  test("parses issue identifier prefix", () => {
    expect(parseLinearLinkedDocumentTitle("BOS-123 - Tax letter")).toEqual({
      issueIdentifier: "BOS-123",
      displayTitle: "Tax letter",
    });
  });

  test("parses single-letter team keys like L-1", () => {
    expect(parseLinearLinkedDocumentTitle("L-1 - Letter document")).toEqual({
      issueIdentifier: "L-1",
      displayTitle: "Letter document",
    });
    expect(parseLinearLinkedDocumentTitle("l-42 - Reply")).toEqual({
      issueIdentifier: "L-42",
      displayTitle: "Reply",
    });
  });

  test("does not treat meeting dates as issue identifiers", () => {
    expect(parseLinearLinkedDocumentTitle("2026-06-14 - Team sync")).toEqual({
      issueIdentifier: null,
      displayTitle: "2026-06-14 - Team sync",
    });
  });

  test("returns full title when no prefix", () => {
    expect(parseLinearLinkedDocumentTitle("Plain document")).toEqual({
      issueIdentifier: null,
      displayTitle: "Plain document",
    });
  });
});

describe("buildLinearLinkedDocumentTitle", () => {
  test("prefixes display title with issue identifier", () => {
    expect(buildLinearLinkedDocumentTitle("BOS-123", "Tax letter")).toBe("BOS-123 - Tax letter");
  });

  test("returns display title when identifier is missing", () => {
    expect(buildLinearLinkedDocumentTitle(null, "Tax letter")).toBe("Tax letter");
  });
});

describe("linearLinkedDocumentDisplayTitle", () => {
  test("strips linked issue prefix for display", () => {
    expect(linearLinkedDocumentDisplayTitle("BOS-70 - Insurance reply")).toBe("Insurance reply");
  });

  test("leaves unrelated titles unchanged", () => {
    expect(linearLinkedDocumentDisplayTitle("Meeting notes")).toBe("Meeting notes");
  });
});

describe("hasLinearLinkedDocumentIssue", () => {
  test("detects linked issue titles", () => {
    expect(hasLinearLinkedDocumentIssue("QM-9 - Letter")).toBe(true);
    expect(hasLinearLinkedDocumentIssue("Plain title")).toBe(false);
  });
});
