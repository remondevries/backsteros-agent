import type { AttachmentPreviewTarget, AttachmentWireInput, MessageAttachment, PendingAttachment } from "./types";

export const MAX_ATTACHMENTS = 5;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_SDK_IMAGE_BYTES = 1_500_000;
export const MAX_IMAGE_DIMENSION = 2048;
export const MAX_TEXT_BYTES = 512 * 1024;
export const MAX_BINARY_BYTES = 25 * 1024 * 1024;

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

export function isImageFile(file: File): boolean {
  const mimeType = resolveMimeType(file.name, file.type || "");
  return mimeType.startsWith("image/") || IMAGE_EXTENSIONS.has(getExtension(file.name));
}

export function isTextLikeFile(file: File): boolean {
  const mimeType = resolveMimeType(file.name, file.type || "");
  if (mimeType.startsWith("text/")) return true;
  if (
    mimeType === "application/json" ||
    mimeType === "application/markdown" ||
    mimeType === "application/xml" ||
    mimeType === "application/javascript"
  ) {
    return true;
  }
  return TEXT_EXTENSIONS.has(getExtension(file.name));
}

export function validateAttachment(
  file: File,
  currentCount: number,
): string | null {
  if (currentCount >= MAX_ATTACHMENTS) {
    return `Maximum ${MAX_ATTACHMENTS} attachments allowed`;
  }

  if (isImageFile(file)) {
    if (file.size > MAX_IMAGE_BYTES) {
      return `${file.name} exceeds the 10 MB image limit`;
    }
    return null;
  }

  if (isTextLikeFile(file)) {
    if (file.size > MAX_TEXT_BYTES) {
      return `${file.name} exceeds the 512 KB inline text limit`;
    }
    return null;
  }

  if (file.size > MAX_BINARY_BYTES) {
    return `${file.name} exceeds the 25 MB file limit`;
  }

  return null;
}

export function createPendingAttachment(file: File): PendingAttachment {
  const mimeType = resolveMimeType(file.name, file.type || "");
  const previewUrl = isImageFile(file) ? URL.createObjectURL(file) : undefined;

  return {
    id: crypto.randomUUID(),
    file,
    name: file.name,
    mimeType,
    size: file.size,
    previewUrl,
  };
}

export function revokePendingAttachment(attachment: PendingAttachment) {
  if (attachment.previewUrl) {
    URL.revokeObjectURL(attachment.previewUrl);
  }
}

export async function prepareImageForUpload(file: File): Promise<File> {
  if (!isImageFile(file)) {
    return file;
  }

  if (file.size <= MAX_SDK_IMAGE_BYTES) {
    try {
      const bitmap = await createImageBitmap(file);
      const withinBounds =
        bitmap.width <= MAX_IMAGE_DIMENSION && bitmap.height <= MAX_IMAGE_DIMENSION;
      bitmap.close();
      if (withinBounds) {
        return file;
      }
    } catch {
      return file;
    }
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.82);
    });
    if (!blob) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export async function prepareFilesForUpload(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => prepareImageForUpload(file)));
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error(`Failed to read ${file.name}`));
        return;
      }
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export async function pendingAttachmentsToWire(
  attachments: PendingAttachment[],
): Promise<AttachmentWireInput[]> {
  const wire = await Promise.all(
    attachments.map(async (attachment) => ({
      name: attachment.name,
      mimeType: attachment.mimeType,
      data: await fileToBase64(attachment.file),
    })),
  );

  for (const item of wire) {
    if (!item.data) {
      throw new Error(`Could not read ${item.name}`);
    }
  }

  return wire;
}

export function pendingAttachmentsToMessageAttachments(
  pending: PendingAttachment[],
  serverAttachments?: MessageAttachment[],
): MessageAttachment[] {
  return pending.map((attachment, index) => ({
    kind: isImageFile(attachment.file)
      ? "image"
      : isTextLikeFile(attachment.file)
        ? "text"
        : "binary",
    name: attachment.name,
    mimeType: attachment.mimeType,
    vaultPath: serverAttachments?.[index]?.vaultPath,
    previewUrl: attachment.previewUrl,
  }));
}

export function filesFromDataTransfer(dataTransfer: DataTransfer): File[] {
  return Array.from(dataTransfer.files ?? []);
}

export function filesFromClipboard(dataTransfer: DataTransfer): File[] {
  const files = filesFromDataTransfer(dataTransfer);
  if (files.length > 0) {
    return files;
  }

  const pasted: File[] = [];
  for (const item of Array.from(dataTransfer.items ?? [])) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (file) pasted.push(file);
  }
  return pasted;
}

export function toAttachmentPreviewTarget(
  attachment: PendingAttachment | MessageAttachment,
): AttachmentPreviewTarget {
  const kind =
    "kind" in attachment
      ? attachment.kind
      : attachment.previewUrl
        ? "image"
        : "binary";

  return {
    name: attachment.name,
    mimeType: attachment.mimeType,
    kind,
    previewUrl: attachment.previewUrl,
    vaultPath: "vaultPath" in attachment ? attachment.vaultPath : undefined,
    file: "file" in attachment ? attachment.file : undefined,
  };
}
