const OBSIDIAN_URL = /^obsidian:\/\//i;

function basename(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "");
  const index = normalized.lastIndexOf("/");
  return index >= 0 ? normalized.slice(index + 1) : normalized;
}

export function normalizeObsidianFilePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.toLowerCase().endsWith(".md")) {
    return normalized.slice(0, -3);
  }
  return normalized;
}

export function getVaultName(notesPath: string, override?: string | null): string {
  const trimmed = override?.trim();
  if (trimmed) {
    return trimmed;
  }
  return basename(notesPath);
}

export function buildObsidianUri(vaultName: string, filePath: string): string {
  const file = normalizeObsidianFilePath(filePath);
  return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(file)}`;
}

export function isObsidianUrl(href: string): boolean {
  return OBSIDIAN_URL.test(href);
}

export function isOpenableExternalUrl(href: string): boolean {
  return /^https?:\/\//i.test(href) || isObsidianUrl(href);
}

export function parseObsidianUrl(href: string): { vault?: string; file?: string } | null {
  if (!isObsidianUrl(href)) {
    return null;
  }

  try {
    const url = new URL(href);
    return {
      vault: url.searchParams.get("vault") ?? undefined,
      file: url.searchParams.get("file") ?? undefined,
    };
  } catch {
    return null;
  }
}

export function linkifyWikilinks(content: string, vaultName: string): string {
  return content.replace(/\[\[([^\]\n]+)\]\]/g, (match, inner: string) => {
    const aliasSeparator = inner.indexOf("|");
    const targetPart =
      aliasSeparator >= 0 ? inner.slice(0, aliasSeparator).trim() : inner.trim();
    const alias =
      aliasSeparator >= 0 ? inner.slice(aliasSeparator + 1).trim() : targetPart.trim();

    if (!targetPart) {
      return match;
    }

    const parsedTarget = targetPart.split("#")[0]?.split("^")[0]?.trim() ?? targetPart;
    const fileParam = parsedTarget.includes("/") || parsedTarget.endsWith(".md")
      ? parsedTarget.endsWith(".md")
        ? parsedTarget
        : `${parsedTarget}.md`
      : parsedTarget;

    const href = buildObsidianUri(vaultName, fileParam);
    const label = alias || targetPart;
    return `[${label}](${href})`;
  });
}
