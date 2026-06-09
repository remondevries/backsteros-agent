export type LinearIssueLinkMode = "external" | "internal";

const LINEAR_WEB_URL =
  /^https?:\/\/(?:www\.)?(?:linear\.app|public\.linear\.app)\//i;

let issueLinkMode: LinearIssueLinkMode = "external";

export function getLinearIssueLinkMode(): LinearIssueLinkMode {
  return issueLinkMode;
}

export function setLinearIssueLinkMode(mode: LinearIssueLinkMode): void {
  issueLinkMode = mode === "internal" ? "internal" : "external";
}

export function isLinearWebUrl(url: string): boolean {
  return LINEAR_WEB_URL.test(url.trim());
}

export function isLinearAppUrl(url: string): boolean {
  return /^linear:\/\//i.test(url.trim());
}

export function resolveLinearOpenUrl(
  webUrl: string,
  mode: LinearIssueLinkMode = issueLinkMode,
): string {
  if (mode !== "internal" || !isLinearWebUrl(webUrl)) {
    return webUrl;
  }

  return webUrl.replace(/^https:\/\/(?:www\.)?linear\.app/i, "linear://linear.app");
}
