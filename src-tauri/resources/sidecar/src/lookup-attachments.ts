import {
  isImageAttachment,
  isTextLikeFile,
  MAX_ATTACHMENTS,
  MAX_BINARY_BYTES,
  MAX_IMAGE_BYTES,
  MAX_TEXT_BYTES,
  resolveMimeType,
} from "./attachments.ts";
import { prepareLookupAttachmentContent } from "./lookup-limits.ts";
import { extractPdfText } from "./lookup-pdf-text.ts";
import type { AttachmentInput, MessageAttachmentMeta } from "./types.ts";

export const MAX_GEMINI_INLINE_BYTES = 20 * 1024 * 1024;

export type GeminiContentPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

function getExtension(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

export function isPdfAttachment(name: string, mimeType: string): boolean {
  const resolved = resolveMimeType(name, mimeType);
  return resolved === "application/pdf" || getExtension(name) === ".pdf";
}

const AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".ogg",
  ".flac",
]);

const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".mov",
  ".mpeg",
  ".mpg",
  ".webm",
  ".avi",
]);

export function isAudioAttachment(name: string, mimeType: string): boolean {
  const resolved = resolveMimeType(name, mimeType);
  return resolved.startsWith("audio/") || AUDIO_EXTENSIONS.has(getExtension(name));
}

export function isVideoAttachment(name: string, mimeType: string): boolean {
  const resolved = resolveMimeType(name, mimeType);
  if (resolved.startsWith("video/")) return true;
  const ext = getExtension(name);
  return VIDEO_EXTENSIONS.has(ext) && !AUDIO_EXTENSIONS.has(ext);
}

function validateLookupAttachment(
  attachment: AttachmentInput,
  buffer: Buffer,
): { kind: MessageAttachmentMeta["kind"]; error?: string } {
  const mimeType = resolveMimeType(attachment.name, attachment.mimeType);

  if (isImageAttachment(attachment.name, mimeType)) {
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return { kind: "image", error: `${attachment.name} exceeds the 10 MB image limit` };
    }
    if (buffer.byteLength > MAX_GEMINI_INLINE_BYTES) {
      return { kind: "image", error: `${attachment.name} exceeds the 20 MB Gemini inline limit` };
    }
    return { kind: "image" };
  }

  if (isTextLikeFile(attachment.name, mimeType)) {
    if (buffer.byteLength > MAX_TEXT_BYTES) {
      return { kind: "text", error: `${attachment.name} exceeds the 512 KB inline text limit` };
    }
    return { kind: "text" };
  }

  if (isPdfAttachment(attachment.name, mimeType)) {
    if (buffer.byteLength > MAX_GEMINI_INLINE_BYTES) {
      return { kind: "binary", error: `${attachment.name} exceeds the 20 MB PDF limit` };
    }
    return { kind: "binary" };
  }

  if (isAudioAttachment(attachment.name, mimeType)) {
    if (buffer.byteLength > MAX_GEMINI_INLINE_BYTES) {
      return { kind: "binary", error: `${attachment.name} exceeds the 20 MB audio limit` };
    }
    return { kind: "binary" };
  }

  if (isVideoAttachment(attachment.name, mimeType)) {
    if (buffer.byteLength > MAX_GEMINI_INLINE_BYTES) {
      return { kind: "binary", error: `${attachment.name} exceeds the 20 MB video limit` };
    }
    return { kind: "binary" };
  }

  if (buffer.byteLength > MAX_BINARY_BYTES) {
    return { kind: "binary", error: `${attachment.name} exceeds the 25 MB file limit` };
  }

  return {
    kind: "binary",
    error: `${attachment.name} is not supported. Attach images, PDFs, audio, video, or text files.`,
  };
}

export function formatExtractedAttachmentText(name: string, content: string): string {
  const prepared = prepareLookupAttachmentContent(content);
  return `[Attached file: ${name}]\n\`\`\`\n${prepared}\n\`\`\``;
}

export async function buildGeminiUserParts(
  text: string,
  attachments: AttachmentInput[],
): Promise<{ parts: GeminiContentPart[]; attachmentMeta: MessageAttachmentMeta[] }> {
  if (attachments.length > MAX_ATTACHMENTS) {
    throw new Error(`Maximum ${MAX_ATTACHMENTS} attachments allowed`);
  }

  const parts: GeminiContentPart[] = [];
  const attachmentMeta: MessageAttachmentMeta[] = [];
  const textParts: string[] = [];

  if (text.trim()) {
    textParts.push(text.trim());
  }

  for (const attachment of attachments) {
    const data = attachment.data.replace(/\s+/g, "");
    const buffer = Buffer.from(data, "base64");
    const mimeType = resolveMimeType(attachment.name, attachment.mimeType);
    const validation = validateLookupAttachment({ ...attachment, data, mimeType }, buffer);
    if (validation.error) {
      throw new Error(validation.error);
    }

    if (validation.kind === "text") {
      textParts.push(formatExtractedAttachmentText(attachment.name, buffer.toString("utf8")));
      attachmentMeta.push({
        kind: "text",
        name: attachment.name,
        mimeType,
      });
      continue;
    }

    if (isPdfAttachment(attachment.name, mimeType)) {
      const extracted =
        attachment.extractedText?.trim() || (await extractPdfText(buffer)) || null;
      if (extracted) {
        attachment.extractedText = extracted;
        textParts.push(formatExtractedAttachmentText(attachment.name, extracted));
        attachmentMeta.push({
          kind: "binary",
          name: attachment.name,
          mimeType: "application/pdf",
        });
        continue;
      }

      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data,
        },
      });
      attachmentMeta.push({
        kind: "binary",
        name: attachment.name,
        mimeType: "application/pdf",
      });
      continue;
    }

    if (
      validation.kind === "image" ||
      isAudioAttachment(attachment.name, mimeType) ||
      isVideoAttachment(attachment.name, mimeType)
    ) {
      parts.push({
        inlineData: {
          mimeType,
          data,
        },
      });
      attachmentMeta.push({
        kind: validation.kind,
        name: attachment.name,
        mimeType,
      });
      continue;
    }
  }

  if (textParts.length > 0) {
    parts.unshift({ text: textParts.join("\n\n") });
  }

  if (parts.length === 0) {
    throw new Error("text or attachments are required");
  }

  return { parts, attachmentMeta };
}
