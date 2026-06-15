import type { LinearDocumentContent } from "./api";
import type { ProjectDocumentEntity } from "./documentStatusGroups";
import { parseLinearLinkedDocumentTitle } from "./linearLinkedDocumentTitle";

export type DocumentLinkedIssueRef = {
  issueId: string | null;
  issueIdentifier: string | null;
  displayTitle: string;
  usesLegacyTitleLink: boolean;
};

export function resolveDocumentLinkedIssue(
  document:
    | Pick<
        ProjectDocumentEntity | LinearDocumentContent,
        "title" | "linkedIssueId" | "linkedIssueIdentifier"
      >
    | null
    | undefined,
): DocumentLinkedIssueRef {
  const title = document?.title?.trim() ?? "";
  const parsed = parseLinearLinkedDocumentTitle(title);
  const linkedIssueId = document?.linkedIssueId?.trim() || null;
  const linkedIssueIdentifier =
    document?.linkedIssueIdentifier?.trim().toUpperCase() ||
    parsed.issueIdentifier ||
    null;
  const usesLegacyTitleLink = linkedIssueId == null && parsed.issueIdentifier != null;
  const displayTitle = parsed.issueIdentifier
    ? parsed.displayTitle || "Untitled"
    : title || "Untitled";

  return {
    issueId: linkedIssueId,
    issueIdentifier: linkedIssueIdentifier,
    displayTitle,
    usesLegacyTitleLink,
  };
}

export function hasDocumentLinkedIssue(
  document:
    | Pick<
        ProjectDocumentEntity | LinearDocumentContent,
        "title" | "linkedIssueId" | "linkedIssueIdentifier"
      >
    | null
    | undefined,
): boolean {
  const ref = resolveDocumentLinkedIssue(document);
  return ref.issueId != null || ref.issueIdentifier != null;
}
