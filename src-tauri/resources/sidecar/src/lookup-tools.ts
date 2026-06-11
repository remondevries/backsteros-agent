export type LookupSearchMode = "web" | "docs";

const URL_PATTERN =
  /https?:\/\/[^\s<>"')\]]+/gi;

export function normalizeLookupSearchMode(value: string | undefined): LookupSearchMode {
  return value === "docs" ? "docs" : "web";
}

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_PATTERN) ?? [];
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const match of matches) {
    const trimmed = match.replace(/[.,;:!?)]+$/, "");
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    urls.push(trimmed);
  }
  return urls.slice(0, 20);
}

export function buildLookupTools(
  searchMode: LookupSearchMode,
  ...texts: string[]
): Array<Record<string, Record<string, never>>> {
  const tools: Array<Record<string, Record<string, never>>> = [];
  const combined = texts.filter(Boolean).join("\n");
  const hasUrls = extractUrls(combined).length > 0;

  if (searchMode === "web") {
    tools.push({ google_search: {} });
  }

  if (hasUrls) {
    tools.push({ url_context: {} });
  }

  return tools;
}
