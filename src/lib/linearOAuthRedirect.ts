export const LINEAR_OAUTH_CALLBACK_PATH = "/linear/oauth/callback";

export const LINEAR_OAUTH_PORT_RANGE = { start: 3510, end: 3515 } as const;

export function buildLinearOAuthRedirectUri(port: number): string {
  return `http://localhost:${port}${LINEAR_OAUTH_CALLBACK_PATH}`;
}

export const LINEAR_OAUTH_PRIMARY_REDIRECT_URI = buildLinearOAuthRedirectUri(
  LINEAR_OAUTH_PORT_RANGE.start,
);

export function getLinearOAuthRedirectUris(): string[] {
  const uris: string[] = [];
  for (let port = LINEAR_OAUTH_PORT_RANGE.start; port <= LINEAR_OAUTH_PORT_RANGE.end; port += 1) {
    uris.push(buildLinearOAuthRedirectUri(port));
  }
  return uris;
}
