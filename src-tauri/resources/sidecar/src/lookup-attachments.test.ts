import { describe, expect, test } from "bun:test";
import { buildGeminiUserParts, isPdfAttachment } from "./lookup-attachments.ts";

describe("lookup attachments", () => {
  test("detects pdf attachments", () => {
    expect(isPdfAttachment("letter.pdf", "application/octet-stream")).toBe(true);
    expect(isPdfAttachment("notes.txt", "text/plain")).toBe(false);
  });

  test("builds inline pdf and text parts for Gemini", async () => {
    const pdfData = Buffer.from("%PDF-1.4").toString("base64");
    const { parts, attachmentMeta } = await buildGeminiUserParts("Summarize this", [
      {
        name: "letter.pdf",
        mimeType: "application/pdf",
        data: pdfData,
      },
    ]);

    expect(parts).toEqual([
      { text: "Summarize this" },
      { inlineData: { mimeType: "application/pdf", data: pdfData } },
    ]);
    expect(attachmentMeta).toEqual([
      {
        kind: "binary",
        name: "letter.pdf",
        mimeType: "application/pdf",
      },
    ]);
  });

  test("prefers extracted pdf text over inline pdf data", async () => {
    const { parts } = await buildGeminiUserParts("Summarize this", [
      {
        name: "letter.pdf",
        mimeType: "application/pdf",
        data: Buffer.from("%PDF-1.4").toString("base64"),
        extractedText: "Line one\nLine two",
      },
    ]);

    expect(parts).toEqual([
      {
        text: "Summarize this\n\n[Attached file: letter.pdf]\n```\nLine one\nLine two\n```",
      },
    ]);
  });

  test("accepts audio attachments as inline data", async () => {
    const audioData = Buffer.from("fake-audio").toString("base64");
    const { parts } = await buildGeminiUserParts("Transcribe this", [
      {
        name: "memo.m4a",
        mimeType: "audio/mp4",
        data: audioData,
      },
    ]);

    expect(parts).toEqual([
      { text: "Transcribe this" },
      { inlineData: { mimeType: "audio/mp4", data: audioData } },
    ]);
  });

  test("inlines text files into the text part", async () => {
    const content = Buffer.from("hello").toString("base64");
    const { parts } = await buildGeminiUserParts("", [
      {
        name: "notes.txt",
        mimeType: "text/plain",
        data: content,
      },
    ]);

    expect(parts).toHaveLength(1);
    expect(parts[0]).toMatchObject({
      text: expect.stringContaining("notes.txt"),
    });
  });
});
