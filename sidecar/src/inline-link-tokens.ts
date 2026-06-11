export function buildLinearIssueLinkToken(label: string, url: string): string {
  const trimmedLabel = label.trim();
  const trimmedUrl = url.trim();
  if (!trimmedLabel || !trimmedUrl) return "";
  const encodedLabel = trimmedLabel.replace(/\s+/g, "_");
  return `{{linear-issue-link:${encodedLabel}|${trimmedUrl}}}`;
}

export function buildVaultNoteLinkToken(label: string, vaultPath: string): string {
  const trimmedLabel = label.trim();
  const trimmedPath = vaultPath.trim().replace(/\\/g, "/");
  if (!trimmedLabel || !trimmedPath) return "";
  const encodedLabel = trimmedLabel.replace(/\s+/g, "_");
  return `{{vault-note-link:${encodedLabel}|${trimmedPath}}}`;
}
