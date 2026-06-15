const LEADING_ATTACHMENT_LINE = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\s*\n?/u;

export function displayTitleFromUploadFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop()?.trim() || "Untitled";
  const withoutExt = base.replace(/\.[^.]+$/u, "").trim();
  return withoutExt || "Untitled";
}

export function buildLetterDocumentLeadingLine(filename: string, assetUrl: string): string {
  const label = filename.trim() || "attachment";
  return `[${label}](${assetUrl})\n\n`;
}

export function stripLeadingAttachmentLineFromContent(content: string): string {
  return content.replace(LEADING_ATTACHMENT_LINE, "");
}

export function hasLeadingAttachmentLine(content: string): boolean {
  return LEADING_ATTACHMENT_LINE.test(content);
}
