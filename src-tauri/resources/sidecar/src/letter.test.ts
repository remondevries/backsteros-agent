import { describe, expect, test } from "bun:test";
import {
  buildLetterAnalysisResponse,
  buildLetterFiledResponse,
  isLetterConfirmQuickAction,
  isLetterQuickAction,
  letterFilingPayloadToMetadata,
  parseLetterFilenameHints,
  parseLetterFilingPayload,
  serializeLetterFilingPayload,
} from "./letter.ts";

describe("letter quick actions", () => {
  test("recognizes letter action ids", () => {
    expect(isLetterQuickAction("letter")).toBe(true);
    expect(isLetterConfirmQuickAction("letter-confirm")).toBe(true);
    expect(isLetterQuickAction("letter-confirm")).toBe(false);
  });
});

describe("parseLetterFilenameHints", () => {
  test("extracts date and organization from standard letter filenames", () => {
    expect(parseLetterFilenameHints("2025-10-25 - Gemeente Leeuwarden - Brief.pdf")).toEqual({
      receivedDate: "2025-10-25",
      organization: "Gemeente Leeuwarden",
      subject: "Brief",
    });
  });

  test("extracts organization and document type from dwangbevel filenames", () => {
    expect(parseLetterFilenameHints("2025-06-21 - Belastingdienst - Dwangbevel.pdf")).toEqual({
      receivedDate: "2025-06-21",
      organization: "Belastingdienst",
      subject: "Dwangbevel",
    });
  });
});

describe("buildLetterAnalysisResponse", () => {
  test("builds review table from proposal", () => {
    const response = buildLetterAnalysisResponse({
      assigned: "Remon de Vries",
      received: "2026-03-08",
      organization: "Belastingdienst",
      project: "",
      note: "A tax assessment letter for 2025.",
      missing: [],
      raw: { sender: "Belastingdienst" },
    });

    expect(response).toContain("I reviewed the letter and found this:");
    expect(response).toContain("| Assigned | Remon de Vries |");
    expect(response).toContain("| Organization | Belastingdienst |");
  });
});

describe("letter filing payload", () => {
  test("round-trips structured filing metadata", () => {
    const payload = {
      kind: "letter_filing" as const,
      assigned: "Jane Doe",
      status: "Inbox",
      received: "2026-03-08",
      organization: "Belastingdienst",
      project: "Taxes",
      note: "Assessment for 2025",
    };

    const parsed = parseLetterFilingPayload(serializeLetterFilingPayload(payload));
    expect(parsed).toEqual(payload);

    const metadata = letterFilingPayloadToMetadata(payload, {
      assigned: "",
      received: "2026-03-08",
      organization: "Belastingdienst",
      project: "",
      note: "Assessment for 2025",
      missing: [],
      raw: { sender: "Belastingdienst" },
    });

    expect(metadata.assigned).toBe("Jane Doe");
    expect(metadata.organization).toBe("Belastingdienst");
    expect(metadata.project).toBe("Taxes");
    expect(metadata.note).toBe("Assessment for 2025");
  });
});

describe("buildLetterFiledResponse", () => {
  test("builds update confirmation token", () => {
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

    expect(response).toContain("{{update:letter|Letters|");
    expect(response).toContain("Okay, I added it to your letters.");
    expect(response).toContain("{{vault-note-link:view_letter_note|Letters/2026-03-08 - Belastingdienst.md}}");
  });
});
