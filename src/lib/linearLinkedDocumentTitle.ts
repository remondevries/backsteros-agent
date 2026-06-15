const LINEAR_LINKED_DOCUMENT_TITLE_PATTERN =
  /^([A-Za-z][A-Za-z0-9]{0,9}-\d+)\s*-\s*(.*)$/u;

export type LinearLinkedDocumentTitleParts = {
  issueIdentifier: string | null;
  displayTitle: string;
};

export function parseLinearLinkedDocumentTitle(
  title: string | null | undefined,
): LinearLinkedDocumentTitleParts {
  if (!title) {
    return { issueIdentifier: null, displayTitle: "" };
  }

  const trimmed = title.trim();
  const match = LINEAR_LINKED_DOCUMENT_TITLE_PATTERN.exec(trimmed);
  if (!match) {
    return { issueIdentifier: null, displayTitle: trimmed };
  }

  return {
    issueIdentifier: match[1]?.trim().toUpperCase() || null,
    displayTitle: (match[2] ?? "").trim(),
  };
}

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

export function linearLinkedDocumentDisplayTitle(title: string | null | undefined): string {
  const { issueIdentifier, displayTitle } = parseLinearLinkedDocumentTitle(title);
  if (issueIdentifier) {
    return displayTitle || "Untitled";
  }
  return (title ?? "").trim() || "Untitled";
}

export function hasLinearLinkedDocumentIssue(title: string | null | undefined): boolean {
  return parseLinearLinkedDocumentTitle(title).issueIdentifier != null;
}
