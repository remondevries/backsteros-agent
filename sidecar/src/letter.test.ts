import { describe, expect, test } from "bun:test";
import {
  buildLetterAnalysisResponse,
  buildLetterFiledResponse,
  isLetterConfirmQuickAction,
  isLetterQuickAction,
} from "./letter.ts";

describe("letter quick actions", () => {
  test("recognizes letter action ids", () => {
    expect(isLetterQuickAction("letter")).toBe(true);
    expect(isLetterConfirmQuickAction("letter-confirm")).toBe(true);
    expect(isLetterQuickAction("letter-confirm")).toBe(false);
  });
});

describe("buildLetterAnalysisResponse", () => {
  test("summarizes findings and asks for confirmation", () => {
    const response = buildLetterAnalysisResponse({
      creator: "Jane Doe",
      organization: "Belastingdienst",
      receivedDate: "2026-03-08",
      subject: "Tax assessment",
      summary: "A tax assessment letter for 2025.",
    });

    expect(response).toContain("Jane Doe");
    expect(response).toContain("Belastingdienst");
    expect(response).toContain("2026-03-08");
    expect(response).toContain("How would you like to file this?");
  });
});

describe("buildLetterFiledResponse", () => {
  test("includes vault paths and metadata", () => {
    const response = buildLetterFiledResponse(
      {
        pdfPath: "Letters/2026-03-08 - Belastingdienst.pdf",
        wrapperPath: "Letters/2026-03-08 - Belastingdienst.md",
        pdfFileName: "2026-03-08 - Belastingdienst.pdf",
      },
      {
        creator: "Jane Doe",
        organization: "Belastingdienst",
        date: "2026-03-08",
        status: "Inbox",
      },
    );

    expect(response).toContain("Letters/2026-03-08 - Belastingdienst.pdf");
    expect(response).toContain("Letters/2026-03-08 - Belastingdienst.md");
    expect(response).toContain("Belastingdienst");
  });
});
