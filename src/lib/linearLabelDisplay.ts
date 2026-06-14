const GITHUB_REPO_LABEL_PATTERNS = [
  /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#\s]+)\/([^/?#\s]+?)(?:\.git)?(?:[/?#].*)?$/i,
  /^github\.com\/([^/?#\s]+)\/([^/?#\s]+?)(?:\.git)?(?:[/?#].*)?$/i,
  /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#\s]+)\/([^/?#\s]+?)(?:\.git)?(?:[/?#\s]|$)/i,
] as const;

function normalizeGithubRepoSegment(value: string): string {
  const trimmed = value.trim();
  return trimmed.endsWith(".git") ? trimmed.slice(0, -4) : trimmed;
}

function extractGithubOwnerRepo(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;

  for (const pattern of GITHUB_REPO_LABEL_PATTERNS) {
    const match = pattern.exec(trimmed);
    if (!match) continue;

    const owner = match[1]?.trim();
    const repo = normalizeGithubRepoSegment(match[2] ?? "");
    if (owner && repo) return `${owner}/${repo}`;
  }

  return null;
}

/** Shorten GitHub repo URL labels to `owner/repo` for compact list pills. */
export function abbreviateGithubLabelName(name: string): string {
  return extractGithubOwnerRepo(name) ?? name;
}

/** Full label text for tooltips when the visible pill is abbreviated. */
export function githubLabelHoverTitle(name: string): string {
  const trimmed = name.trim();
  const abbreviated = extractGithubOwnerRepo(trimmed);
  return abbreviated && abbreviated !== trimmed ? trimmed : name;
}
