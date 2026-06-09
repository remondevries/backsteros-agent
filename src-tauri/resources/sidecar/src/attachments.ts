import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { SDKImage, SDKUserMessage } from "@cursor/sdk";
import type { AttachmentInput, MessageAttachmentMeta } from "./types.ts";

export const MAX_ATTACHMENTS = 5;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_SDK_IMAGE_BYTES = 1_500_000;
export const MAX_TEXT_BYTES = 512 * 1024;
export const MAX_BINARY_BYTES = 25 * 1024 * 1024;

const TEXT_EXTENSIONS = new Set([
  ".md",
  ".markdown",
  ".txt",
  ".json",
  ".csv",
  ".tsv",
  ".yaml",
  ".yml",
  ".xml",
  ".html",
  ".htm",
  ".css",
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".log",
]);

function resolveWorkspacePath(notesPath: string, targetPath: string): string {
  const abs = join(notesPath, targetPath);
  const rel = relative(notesPath, abs);
  if (rel.startsWith("..") || rel === "..") {
    throw new Error("Path must stay inside the notes workspace");
  }
  return abs;
}

function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "attachment";
  const cleaned = base.replace(/[^\w.\-() ]+/g, "_").trim();
  return cleaned || "attachment";
}

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".heic",
  ".heif",
]);

const EXTENSION_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".md": "text/markdown",
  ".markdown": "text/markdown",
  ".txt": "text/plain",
  ".json": "application/json",
  ".csv": "text/csv",
  ".tsv": "text/tab-separated-values",
  ".yaml": "text/yaml",
  ".yml": "text/yaml",
  ".xml": "application/xml",
  ".html": "text/html",
  ".htm": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".ts": "text/typescript",
  ".tsx": "text/typescript",
  ".jsx": "text/javascript",
  ".log": "text/plain",
};

function getExtension(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

export function resolveMimeType(name: string, mimeType: string): string {
  const trimmed = mimeType.trim();
  if (trimmed && trimmed !== "application/octet-stream") {
    return trimmed;
  }

  return EXTENSION_MIME[getExtension(name)] ?? (trimmed || "application/octet-stream");
}

export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function isImageAttachment(name: string, mimeType: string): boolean {
  return isImageMime(resolveMimeType(name, mimeType)) || IMAGE_EXTENSIONS.has(getExtension(name));
}

export function isTextLikeFile(name: string, mimeType: string): boolean {
  const resolved = resolveMimeType(name, mimeType);
  if (resolved.startsWith("text/")) return true;
  if (
    resolved === "application/json" ||
    resolved === "application/markdown" ||
    resolved === "application/xml" ||
    resolved === "application/javascript"
  ) {
    return true;
  }
  return TEXT_EXTENSIONS.has(getExtension(name));
}

export function stageBinaryFile(
  notesPath: string,
  name: string,
  buffer: Buffer,
): string {
  const safeName = sanitizeFileName(name);
  const vaultPath = join("Inbox", "attachments", `${crypto.randomUUID()}-${safeName}`).replace(
    /\\/g,
    "/",
  );
  const abs = resolveWorkspacePath(notesPath, vaultPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, buffer);
  return vaultPath;
}

function validateAttachmentInput(
  attachment: AttachmentInput,
  buffer: Buffer,
): { kind: MessageAttachmentMeta["kind"]; error?: string } {
  const { name } = attachment;
  const mimeType = resolveMimeType(name, attachment.mimeType);

  if (isImageAttachment(name, mimeType)) {
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return {
        kind: "image",
        error: `${name} exceeds the 10 MB image limit`,
      };
    }
    return { kind: "image" };
  }

  if (isTextLikeFile(name, mimeType)) {
    if (buffer.byteLength > MAX_TEXT_BYTES) {
      return {
        kind: "text",
        error: `${name} exceeds the 512 KB inline text limit`,
      };
    }
    return { kind: "text" };
  }

  if (buffer.byteLength > MAX_BINARY_BYTES) {
    return {
      kind: "binary",
      error: `${name} exceeds the 25 MB file limit`,
    };
  }
  return { kind: "binary" };
}

export function buildUserMessage(
  text: string,
  attachments: AttachmentInput[],
  notesPath: string,
): { message: SDKUserMessage; attachmentMeta: MessageAttachmentMeta[] } {
  if (attachments.length > MAX_ATTACHMENTS) {
    throw new Error(`Maximum ${MAX_ATTACHMENTS} attachments allowed`);
  }

  const images: SDKImage[] = [];
  const attachmentMeta: MessageAttachmentMeta[] = [];
  let messageText = text;
  const textParts: string[] = messageText ? [messageText] : [];

  for (const attachment of attachments) {
    const data = attachment.data.replace(/\s+/g, "");
    const buffer = Buffer.from(data, "base64");
    const mimeType = resolveMimeType(attachment.name, attachment.mimeType);
    const normalizedAttachment = { ...attachment, data, mimeType };
    const validation = validateAttachmentInput(normalizedAttachment, buffer);
    if (validation.error) {
      throw new Error(validation.error);
    }

    if (validation.kind === "image") {
      if (buffer.byteLength <= MAX_SDK_IMAGE_BYTES) {
        images.push({
          data,
          mimeType,
        });
        textParts.push(`[Attached image: ${attachment.name}]`);
      } else {
        const vaultPath = stageBinaryFile(notesPath, attachment.name, buffer);
        textParts.push(
          `[Attached image saved to workspace: ${vaultPath}. It was too large to send inline.]`,
        );
        attachmentMeta.push({
          kind: "binary",
          name: attachment.name,
          mimeType,
          vaultPath,
        });
        continue;
      }
      attachmentMeta.push({
        kind: "image",
        name: attachment.name,
        mimeType,
      });
      continue;
    }

    if (validation.kind === "text") {
      const content = buffer.toString("utf8");
      textParts.push(
        `[Attached file: ${attachment.name}]\n\`\`\`\n${content}\n\`\`\``,
      );
      attachmentMeta.push({
        kind: "text",
        name: attachment.name,
        mimeType,
      });
      continue;
    }

    const vaultPath = stageBinaryFile(notesPath, attachment.name, buffer);
    textParts.push(`[Attached file saved to workspace: ${vaultPath}]`);
    attachmentMeta.push({
      kind: "binary",
      name: attachment.name,
      mimeType,
      vaultPath,
    });
  }

  messageText = textParts.join("\n\n");

  return {
    message: {
      text: messageText,
      ...(images.length > 0 ? { images } : {}),
    },
    attachmentMeta,
  };
}
