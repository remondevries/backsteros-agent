import {
  isImageFile,
  isTextLikeFile,
  MAX_ATTACHMENTS,
  MAX_BINARY_BYTES,
  MAX_IMAGE_BYTES,
  MAX_TEXT_BYTES,
  resolveMimeType,
} from "../chat/attachments";

const MAX_GEMINI_INLINE_BYTES = 20 * 1024 * 1024;

const AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".ogg",
  ".flac",
]);

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".mpeg", ".mpg", ".avi"]);

function getExtension(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

function isPdfFile(file: File): boolean {
  const mimeType = resolveMimeType(file.name, file.type || "");
  return mimeType === "application/pdf" || getExtension(file.name) === ".pdf";
}

function isAudioFile(file: File): boolean {
  const mimeType = resolveMimeType(file.name, file.type || "");
  return mimeType.startsWith("audio/") || AUDIO_EXTENSIONS.has(getExtension(file.name));
}

function isVideoFile(file: File): boolean {
  const mimeType = resolveMimeType(file.name, file.type || "");
  if (mimeType.startsWith("video/")) return true;
  return VIDEO_EXTENSIONS.has(getExtension(file.name));
}

export function validateLookupAttachment(file: File, currentCount: number): string | null {
  if (currentCount >= MAX_ATTACHMENTS) {
    return `Maximum ${MAX_ATTACHMENTS} attachments allowed`;
  }

  if (isImageFile(file)) {
    if (file.size > MAX_IMAGE_BYTES) {
      return `${file.name} exceeds the 10 MB image limit`;
    }
    if (file.size > MAX_GEMINI_INLINE_BYTES) {
      return `${file.name} exceeds the 20 MB Gemini inline limit`;
    }
    return null;
  }

  if (isTextLikeFile(file)) {
    if (file.size > MAX_TEXT_BYTES) {
      return `${file.name} exceeds the 512 KB inline text limit`;
    }
    return null;
  }

  if (isPdfFile(file) || isAudioFile(file) || isVideoFile(file)) {
    if (file.size > MAX_GEMINI_INLINE_BYTES) {
      return `${file.name} exceeds the 20 MB file limit`;
    }
    return null;
  }

  if (file.size > MAX_BINARY_BYTES) {
    return `${file.name} exceeds the 25 MB file limit`;
  }

  return `${file.name} is not supported. Attach images, PDFs, audio, video, or text files.`;
}
