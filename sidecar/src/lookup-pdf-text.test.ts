import { describe, expect, test } from "bun:test";
import { isMacOsVisionOcrAvailable } from "./macos-pdf-ocr.ts";
import { extractPdfText, isUsableEmbeddedPdfText } from "./lookup-pdf-text.ts";

describe("isUsableEmbeddedPdfText", () => {
  test("rejects page markers only", () => {
    expect(isUsableEmbeddedPdfText("\n\n-- 1 of 1 --\n\n")).toBe(false);
  });

  test("accepts meaningful embedded text", () => {
    expect(
      isUsableEmbeddedPdfText(
        "Gemeente Leeuwarden\nDagtekening 11-10-2025\nAanmaning gemeentelijke heffingen",
      ),
    ).toBe(true);
  });
});

describe("extractPdfText", () => {
  test("returns null for empty buffers without throwing", async () => {
    const text = await extractPdfText(Buffer.from(""));
    expect(text).toBeNull();
  });

  test("reports macOS vision availability only on darwin", () => {
    if (process.platform === "darwin") {
      expect(isMacOsVisionOcrAvailable()).toBe(true);
    } else {
      expect(isMacOsVisionOcrAvailable()).toBe(false);
    }
  });
});
