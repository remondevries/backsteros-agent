import { PDFParse } from "pdf-parse";
import { extractPdfTextWithMacVision } from "./macos-pdf-ocr.ts";

export interface ExtractPdfTextOptions {
  /** Absolute path to an on-disk PDF — avoids a temp file for macOS Vision OCR. */
  filePath?: string;
}

const PAGE_MARKER_PATTERN = /^[\s\-–—]*\d+\s+of\s+\d+[\s\-–—]*$/i;

export function isUsableEmbeddedPdfText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }

  const meaningfulLines = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !PAGE_MARKER_PATTERN.test(line));

  if (meaningfulLines.length === 0) {
    return false;
  }

  const meaningful = meaningfulLines.join("\n");
  const letters = meaningful.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "").length;
  return meaningful.length >= 40 && letters >= 20;
}

async function extractEmbeddedPdfText(buffer: Buffer): Promise<string | null> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = result.text.trim();
    return isUsableEmbeddedPdfText(text) ? text : null;
  } catch {
    return null;
  } finally {
    await parser.destroy();
  }
}

export async function extractPdfText(
  buffer: Buffer,
  options: ExtractPdfTextOptions = {},
): Promise<string | null> {
  const embedded = await extractEmbeddedPdfText(buffer);
  if (embedded) {
    return embedded;
  }

  return extractPdfTextWithMacVision(buffer, options);
}
