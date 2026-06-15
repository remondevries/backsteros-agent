export const LINEAR_OAUTH_CALLBACK_PATH = "/linear/oauth/callback";

export const LINEAR_OAUTH_PORT_RANGE = { start: 3510, end: 3515 } as const;

/** Vite dev server port — OAuth callback is proxied to the sidecar at this origin. */
const VITE_DEV_PORTS = new Set(["5173"]);

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

function usesViteProxiedLinearOAuthRedirect(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const { hostname, port, protocol } = window.location;
  if (protocol === "https:") {
    return false;
  }
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    return false;
  }
  const effectivePort = port || (protocol === "https:" ? "443" : "80");
  return VITE_DEV_PORTS.has(effectivePort);
}

export function usesPublicLinearOAuthRedirect(): boolean {
  return !isLocalLinearOAuthHost();
}

export function showsLocalLinearOAuthPortFallbacks(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  return isLocalLinearOAuthHost() && !usesViteProxiedLinearOAuthRedirect();
}

export function getLinearOAuthPrimaryRedirectUri(): string {
  if (typeof window !== "undefined") {
    if (usesPublicLinearOAuthRedirect() || usesViteProxiedLinearOAuthRedirect()) {
      return `${window.location.origin}${LINEAR_OAUTH_CALLBACK_PATH}`;
    }
  }
  return buildLinearOAuthRedirectUri(LINEAR_OAUTH_PORT_RANGE.start);
}

/** @deprecated Use getLinearOAuthPrimaryRedirectUri() in browser UI. */
export const LINEAR_OAUTH_PRIMARY_REDIRECT_URI = buildLinearOAuthRedirectUri(
  LINEAR_OAUTH_PORT_RANGE.start,
);

export function getLinearOAuthRedirectUris(): string[] {
  if (typeof window !== "undefined") {
    if (usesPublicLinearOAuthRedirect() || usesViteProxiedLinearOAuthRedirect()) {
      return [`${window.location.origin}${LINEAR_OAUTH_CALLBACK_PATH}`];
    }
  }
  const uris: string[] = [];
  for (let port = LINEAR_OAUTH_PORT_RANGE.start; port <= LINEAR_OAUTH_PORT_RANGE.end; port += 1) {
    uris.push(buildLinearOAuthRedirectUri(port));
  }
  return uris;
}
