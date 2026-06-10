export function buildLinearIssueLinkToken(label: string, url: string): string {
  const trimmedLabel = label.trim();
  const trimmedUrl = url.trim();
  if (!trimmedLabel || !trimmedUrl) return "";
  const encodedLabel = trimmedLabel.replace(/\s+/g, "_");
  return `{{linear-issue-link:${encodedLabel}|${trimmedUrl}}}`;
}
