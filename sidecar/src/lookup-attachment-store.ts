import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getDataDir } from "./config.ts";
import { isPdfAttachment } from "./lookup-attachments.ts";
import { extractPdfText } from "./lookup-pdf-text.ts";
import { resolveMimeType } from "./attachments.ts";
import type { AttachmentInput } from "./types.ts";
import type { MessageAttachmentMeta } from "./types.ts";

interface StoredAttachmentMeta {
  name: string;
  mimeType: string;
  extractedText?: string;
}

function sessionBlobDir(sessionId: string): string {
  const dir = join(getDataDir(), "lookup-sessions", sessionId, "blobs");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function blobPath(storageId: string): string {
  const [sessionId, ...rest] = storageId.split("/");
  if (!sessionId || rest.length === 0) {
    throw new Error("Invalid lookup attachment storage id");
  }
  return join(sessionBlobDir(sessionId), ...rest);
}

export function buildLookupAttachmentStorageId(
  sessionId: string,
  runId: string,
  index: number,
): string {
  return `${sessionId}/${runId}/${index}`;
}

export async function persistLookupAttachments(
  sessionId: string,
  runId: string,
  attachments: AttachmentInput[],
  attachmentMeta: MessageAttachmentMeta[],
): Promise<MessageAttachmentMeta[]> {
  const results: MessageAttachmentMeta[] = [];

  for (const [index, meta] of attachmentMeta.entries()) {
    const attachment = attachments[index];
    if (!attachment?.data) {
      results.push(meta);
      continue;
    }

    const storageId = buildLookupAttachmentStorageId(sessionId, runId, index);
    const path = blobPath(storageId);
    mkdirSync(join(path, ".."), { recursive: true });
    const buffer = Buffer.from(attachment.data.replace(/\s+/g, ""), "base64");
    writeFileSync(path, buffer);

    const mimeType = resolveMimeType(attachment.name, attachment.mimeType);
    let extractedText: string | undefined;
    if (isPdfAttachment(attachment.name, mimeType)) {
      const text = await extractPdfText(buffer);
      if (text) {
        extractedText = text;
      }
    }

    writeFileSync(
      `${path}.meta.json`,
      JSON.stringify({
        name: attachment.name,
        mimeType,
        extractedText,
      } satisfies StoredAttachmentMeta),
    );

    results.push({
      ...meta,
      storageId,
    });
  }

  return results;
}

function readStoredAttachmentMeta(storageId: string): StoredAttachmentMeta | null {
  const path = blobPath(storageId);
  const metaPath = `${path}.meta.json`;
  if (!existsSync(metaPath)) return null;
  try {
    return JSON.parse(readFileSync(metaPath, "utf8")) as StoredAttachmentMeta;
  } catch {
    return null;
  }
}

export function loadStoredLookupAttachmentTexts(
  storageIds: string[],
): Array<{ name: string; mimeType: string; text: string }> {
  const loaded: Array<{ name: string; mimeType: string; text: string }> = [];
  for (const storageId of storageIds) {
    const meta = readStoredAttachmentMeta(storageId);
    if (!meta?.extractedText?.trim()) continue;
    loaded.push({
      name: meta.name,
      mimeType: meta.mimeType,
      text: meta.extractedText.trim(),
    });
  }
  return loaded;
}

export function loadStoredLookupAttachmentsForResend(
  storageIds: string[],
): AttachmentInput[] {
  const loaded: AttachmentInput[] = [];
  for (const storageId of storageIds) {
    const path = blobPath(storageId);
    if (!existsSync(path)) continue;
    const meta = readStoredAttachmentMeta(storageId);
    if (!meta) continue;
    loaded.push({
      name: meta.name,
      mimeType: meta.mimeType,
      data: readFileSync(path).toString("base64"),
      extractedText: meta.extractedText,
    });
  }
  return loaded;
}
