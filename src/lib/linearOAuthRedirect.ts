export const LINEAR_OAUTH_CALLBACK_PATH = "/linear/oauth/callback";

export const LINEAR_OAUTH_PORT_RANGE = { start: 3510, end: 3515 } as const;

export function buildLinearOAuthRedirectUri(port: number): string {
  return `http://localhost:${port}${LINEAR_OAUTH_CALLBACK_PATH}`;
}

function isLocalLinearOAuthHost(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  const { hostname, protocol } = window.location;
  if (protocol === "https:") {
    return false;
  }
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function usesPublicLinearOAuthRedirect(): boolean {
  return !isLocalLinearOAuthHost();
}

export function getLinearOAuthPrimaryRedirectUri(): string {
  if (usesPublicLinearOAuthRedirect() && typeof window !== "undefined") {
    return `${window.location.origin}${LINEAR_OAUTH_CALLBACK_PATH}`;
  }
  return buildLinearOAuthRedirectUri(LINEAR_OAUTH_PORT_RANGE.start);
}

/** @deprecated Use getLinearOAuthPrimaryRedirectUri() in browser UI. */
export const LINEAR_OAUTH_PRIMARY_REDIRECT_URI = buildLinearOAuthRedirectUri(
  LINEAR_OAUTH_PORT_RANGE.start,
);

export function getLinearOAuthRedirectUris(): string[] {
  if (usesPublicLinearOAuthRedirect() && typeof window !== "undefined") {
    return [`${window.location.origin}${LINEAR_OAUTH_CALLBACK_PATH}`];
  }
  const uris: string[] = [];
  for (let port = LINEAR_OAUTH_PORT_RANGE.start; port <= LINEAR_OAUTH_PORT_RANGE.end; port += 1) {
    uris.push(buildLinearOAuthRedirectUri(port));
  }
  return uris;
}
