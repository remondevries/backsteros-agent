const MARKDOWN_LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi;

function stripTrailingUrlPunctuation(url: string): string {
  return url.replace(/[),.;:!?]+$/u, "");
}

function normalizeUrlCandidate(raw: string): string {
  return stripTrailingUrlPunctuation(raw.trim());
}

/** True when the visible link label ends with `.pdf` (case-insensitive). */
export function isPdfLinkLabel(label: string): boolean {
  return /\.pdf$/i.test(label.trim());
}

export type DocumentPdfLink = {
  url: string;
  label: string;
};

export function findFirstPdfLinkInDocumentContent(content: string): DocumentPdfLink | null {
  if (!content.trim()) return null;

  for (const match of content.matchAll(MARKDOWN_LINK)) {
    const label = match[1]?.trim();
    const url = match[2] ? normalizeUrlCandidate(match[2]) : null;
    if (label && url && isPdfLinkLabel(label)) {
      return { url, label };
    }
  }

  return null;
}

export function findFirstPdfUrlInDocumentContent(content: string): string | null {
  return findFirstPdfLinkInDocumentContent(content)?.url ?? null;
}
