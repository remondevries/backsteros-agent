import { looksLikeLinearIssueIdentifier } from "../chat/linearIssue";

export { looksLikeLinearIssueIdentifier };

export function slugifyAppUrlSegment(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "inbox";
}

/** URL segment for the issue's project; inbox issues without a project use `inbox`. */
export function issueProjectSlug(projectName: string | null | undefined): string {
  if (!projectName?.trim()) return "inbox";
  return slugifyAppUrlSegment(projectName);
}

export function canBuildIssueAppUrlPath(issueIdentifier: string | null | undefined): boolean {
  const identifier = issueIdentifier?.trim();
  return Boolean(identifier && looksLikeLinearIssueIdentifier(identifier));
}
