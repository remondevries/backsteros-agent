const LINEAR_LINKED_DOCUMENT_TITLE_PATTERN =
  /^([A-Za-z][A-Za-z0-9]{0,9}-\d+)\s*-\s*(.*)$/u;

export function buildLinearLinkedDocumentTitle(
  issueIdentifier: string | null | undefined,
  displayTitle: string | null | undefined,
): string {
  const title = (displayTitle ?? "").trim() || "Untitled";
  const identifier = issueIdentifier?.trim();
  if (!identifier) {
    return title;
  }
  return `${identifier} - ${title}`;
}

export function displayTitleFromUploadFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop()?.trim() || "Untitled";
  const withoutExt = base.replace(/\.[^.]+$/u, "").trim();
  return withoutExt || "Untitled";
}

export function buildLetterDocumentLeadingLine(filename: string, assetUrl: string): string {
  const label = filename.trim() || "attachment";
  return `[${label}](${assetUrl})\n\n`;
}

export { LINEAR_LINKED_DOCUMENT_TITLE_PATTERN };
