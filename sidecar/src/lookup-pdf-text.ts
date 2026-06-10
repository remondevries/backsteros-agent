import { PDFParse } from "pdf-parse";

export async function extractPdfText(buffer: Buffer): Promise<string | null> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = result.text.trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  } finally {
    await parser.destroy();
  }
}
