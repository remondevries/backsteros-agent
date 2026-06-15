import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  appendAppReturnQuery,
  isDevelopmentAuthMode,
  isUserCursorApiKeyConfigured,
  getLinearOAuthClientCredentials,
  getLinearOAuthPublicBaseUrl,
  getLinearOAuthTokenPath,
  isLinearOAuthAuthenticated,
  isLinearOAuthConfigured,
  resolveAppReturnUrl,
} from "./config.ts";
import { buildOAuthCallbackPageHtml } from "./oauthCallbackPage.ts";
import {
  CONNECT_GATE_PROGRESS_INCOMPLETE,
  connectGateProgressAfterLinearOAuth,
} from "./connectGateProgressConfig.ts";
import { clearLinearOAuthAccessCache } from "./linear/oauth-access.ts";
import { loadUserAccountWorkspace } from "./accounts.ts";
import { isUserAccountSetupComplete } from "./accountWorkspace.ts";
import { fetchLinearViewer } from "./linear/viewer.ts";
import { viewerHasAdministratorAccess } from "./admin-access.ts";

interface OAuthCredentials {
  client_id: string;
  client_secret: string;
}

interface PendingAuthFlow {
  codeVerifier: string;
  state: string;
  redirectUri: string;
  port: number;
  appReturnUrl: string;
}

export const LINEAR_OAUTH_CALLBACK_PATH = "/linear/oauth/callback";
const LINEAR_OAUTH_PORT = 3510;
const PORT_RANGE = { start: LINEAR_OAUTH_PORT, end: 3515 };
/** Vite dev server port — OAuth callback is proxied to the sidecar at this origin. */
const VITE_DEV_PORTS = new Set(["5173"]);
const AUTH_TIMEOUT_MS = 10 * 60 * 1000;
const LINEAR_AUTHORIZE_URL = "https://linear.app/oauth/authorize";
const LINEAR_TOKEN_URL = "https://api.linear.app/oauth/token";
const LINEAR_OAUTH_SCOPES = "read,write,issues:create,comments:create";

let authServer: Server | null = null;
let pendingAuth: PendingAuthFlow | null = null;
let authTimeout: ReturnType<typeof setTimeout> | null = null;

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function createCodeVerifier(): string {
  return base64UrlEncode(randomBytes(32));
}

function createCodeChallenge(codeVerifier: string): string {
  return base64UrlEncode(createHash("sha256").update(codeVerifier).digest());
}

async function loadOAuthCredentials(): Promise<OAuthCredentials> {
  return getLinearOAuthClientCredentials();
}

async function saveTokens(tokens: Record<string, unknown>) {
  const tokenPath = getLinearOAuthTokenPath();
  await mkdir(dirname(tokenPath), { recursive: true });
  await writeFile(tokenPath, `${JSON.stringify(tokens, null, 2)}\n`, { mode: 0o600 });
  clearLinearOAuthAccessCache();
}

function clearAuthTimeout() {
  if (!authTimeout) return;
  clearTimeout(authTimeout);
  authTimeout = null;
}

function scheduleAuthTimeout() {
  clearAuthTimeout();
  authTimeout = setTimeout(() => {
    void stopLinearOAuthAuth();
  }, AUTH_TIMEOUT_MS);
}

function buildLocalLinearOAuthRedirectUri(port: number): string {
  return `http://localhost:${port}${LINEAR_OAUTH_CALLBACK_PATH}`;
}

function buildPublicLinearOAuthRedirectUri(publicBaseUrl: string): string {
  return `${publicBaseUrl.replace(/\/+$/, "")}${LINEAR_OAUTH_CALLBACK_PATH}`;
}

function getLocalLinearOAuthRedirectUris(): string[] {
  const uris: string[] = [];
  for (let port = PORT_RANGE.start; port <= PORT_RANGE.end; port += 1) {
    uris.push(buildLocalLinearOAuthRedirectUri(port));
  }
  return uris;
}

export function usesPublicLinearOAuthCallback(): boolean {
  return Boolean(getLinearOAuthPublicBaseUrl());
}

/**
 * When the UI runs on the Vite dev server (localhost:5173), OAuth callback is proxied to the
 * sidecar so Linear can redirect to the same origin as the app.
 */
export function resolveLinearOAuthCallbackBase(appReturnUrl?: string): string | undefined {
  const explicit = getLinearOAuthPublicBaseUrl();
  if (explicit) {
    return explicit;
  }

  if (!isDevelopmentAuthMode()) {
    return undefined;
  }

  const resolvedReturnUrl = resolveAppReturnUrl(appReturnUrl);
  try {
    const url = new URL(resolvedReturnUrl);
    if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      return undefined;
    }
    const port = url.port || (url.protocol === "https:" ? "443" : "80");
    if (!VITE_DEV_PORTS.has(port)) {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
}

export function getLinearOAuthRedirectUris(): string[] {
  const publicBase = getLinearOAuthPublicBaseUrl();
  if (publicBase) {
    return [buildPublicLinearOAuthRedirectUri(publicBase)];
  }
  return getLocalLinearOAuthRedirectUris();
}

export function getLinearOAuthPrimaryRedirectUri(): string {
  return getLinearOAuthRedirectUris()[0] ?? buildLocalLinearOAuthRedirectUri(LINEAR_OAUTH_PORT);
}

/** @deprecated Use getLinearOAuthPrimaryRedirectUri() for env-aware redirect URI. */
export const LINEAR_OAUTH_PRIMARY_REDIRECT_URI = getLinearOAuthPrimaryRedirectUri();

async function findAvailablePort(): Promise<number> {
  for (let port = PORT_RANGE.start; port <= PORT_RANGE.end; port += 1) {
    const available = await new Promise<boolean>((resolve) => {
      const probe = createServer();
      probe.once("error", () => resolve(false));
      probe.listen(port, () => {
        probe.close(() => resolve(true));
      });
    });
    if (available) return port;
  }

  throw new Error(
    `No available port found for Linear OAuth (${PORT_RANGE.start}-${PORT_RANGE.end})`,
  );
}

function sendHtml(res: import("node:http").ServerResponse, status: number, body: string) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(body);
}

export function isLinearOAuthAuthRunning(): boolean {
  return authServer !== null || pendingAuth !== null;
}

export async function stopLinearOAuthAuth(): Promise<void> {
  clearAuthTimeout();
  pendingAuth = null;

  if (!authServer) return;

  await new Promise<void>((resolve) => {
    authServer!.close(() => resolve());
  });
  authServer = null;
}

async function parseLinearTokenResponse(response: Response): Promise<Record<string, unknown>> {
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message =
      typeof payload.error_description === "string"
        ? payload.error_description
        : typeof payload.error === "string"
          ? payload.error
          : "Linear token exchange failed";
    throw new Error(message);
  }
  return payload;
}

async function exchangeAuthorizationCode(input: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  credentials: OAuthCredentials;
}): Promise<Record<string, unknown>> {
  const pkceBody = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: input.credentials.client_id,
    code_verifier: input.codeVerifier,
  });

  // Linear PKCE: client_secret is optional. Public OAuth apps reject a body secret.
  let response = await fetch(LINEAR_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: pkceBody,
  });

  try {
    return await parseLinearTokenResponse(response);
  } catch (error) {
    const clientSecret = input.credentials.client_secret.trim();
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const missingClientAuth =
      message.includes("invalid_client") ||
      message.includes("cannot retrieve client credentials");
    if (!clientSecret || !missingClientAuth) {
      throw error;
    }
  }

  // Confidential PKCE apps: retry with HTTP Basic auth instead of a body secret.
  const basicAuth = Buffer.from(
    `${input.credentials.client_id}:${input.credentials.client_secret}`,
  ).toString("base64");

  response = await fetch(LINEAR_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: pkceBody,
  });

  return parseLinearTokenResponse(response);
}

export async function handleLinearOAuthCallback(
  query: URLSearchParams | Record<string, string | undefined>,
): Promise<{ status: number; html: string }> {
  const params =
    query instanceof URLSearchParams
      ? query
      : new URLSearchParams(
          Object.entries(query).flatMap(([key, value]) =>
            value != null && value !== "" ? [[key, value]] : [],
          ),
        );

  const code = params.get("code");
  const returnedState = params.get("state");
  const flow = pendingAuth;

  try {
    if (!code) {
      return {
        status: 400,
        html: buildOAuthCallbackPageHtml({
          title: "Sign-in incomplete",
          message: "Authorization code missing. Return to BacksterOS and try again.",
          variant: "error",
          connectProgress: CONNECT_GATE_PROGRESS_INCOMPLETE,
        }),
      };
    }

    if (!flow || !returnedState || returnedState !== flow.state) {
      return {
        status: 403,
        html: buildOAuthCallbackPageHtml({
          title: "Sign-in expired",
          message:
            "This sign-in link expired. Return to BacksterOS and click Connect with Linear again.",
          variant: "error",
          connectProgress: CONNECT_GATE_PROGRESS_INCOMPLETE,
        }),
      };
    }

    const credentials = await loadOAuthCredentials();
    const tokens = await exchangeAuthorizationCode({
      code,
      redirectUri: flow.redirectUri,
      codeVerifier: flow.codeVerifier,
      credentials,
    });

    await saveTokens(tokens);

    const hasCursorApiKey = isUserCursorApiKeyConfigured();
    const appReturnBase = resolveAppReturnUrl(flow.appReturnUrl);

    let setupComplete = false;
    try {
      const viewer = await fetchLinearViewer();
      const isAdministrator = await viewerHasAdministratorAccess();
      const workspace = loadUserAccountWorkspace(viewer.id);
      setupComplete = isUserAccountSetupComplete(workspace, { isAdministrator });
    } catch {
      setupComplete = false;
    }

    let successDashboardUrl = appReturnBase;
    let successDashboardLabel = "Open BacksterOS";
    let successMessage = "Thank you for connecting. You're all set to use BacksterOS.";

    if (!setupComplete) {
      if (hasCursorApiKey) {
        successDashboardUrl = appendAppReturnQuery(appReturnBase, { connect: "setup" });
        successDashboardLabel = "Go to setup";
        successMessage =
          "Thank you for connecting. Answer a few quick questions to finish setup.";
      } else {
        successDashboardUrl = appendAppReturnQuery(appReturnBase, { connect: "cursor" });
        successDashboardLabel = "Next step";
        successMessage = "You're connected to Linear. Continue below to set up Cursor Agent.";
      }
    }

    const html = buildOAuthCallbackPageHtml({
      title: "Connected successfully",
      message: successMessage,
      variant: "success",
      appReturnUrl: flow.appReturnUrl,
      successDashboardUrl,
      successDashboardLabel,
      connectProgress: {
        ...connectGateProgressAfterLinearOAuth(hasCursorApiKey),
        setupComplete,
      },
    });

    await stopLinearOAuthAuth();
    return { status: 200, html };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication failed";
    await stopLinearOAuthAuth();
    return {
      status: 500,
      html: buildOAuthCallbackPageHtml({
        title: "Authentication failed",
        message,
        variant: "error",
        connectProgress: CONNECT_GATE_PROGRESS_INCOMPLETE,
      }),
    };
  }
}

export async function startLinearOAuthAuth(options?: {
  appReturnUrl?: string;
}): Promise<{ authUrl: string; localUrl: string }> {
  if (!isLinearOAuthConfigured()) {
    throw new Error("Linear OAuth credentials are not configured");
  }

  await stopLinearOAuthAuth();

  const credentials = await loadOAuthCredentials();
  const codeVerifier = createCodeVerifier();
  const codeChallenge = createCodeChallenge(codeVerifier);
  const state = randomBytes(32).toString("hex");
  const appReturnUrl = resolveAppReturnUrl(options?.appReturnUrl);

  const redirectBase = resolveLinearOAuthCallbackBase(appReturnUrl);
  let redirectUri: string;
  let port = 0;

  if (redirectBase) {
    redirectUri = buildPublicLinearOAuthRedirectUri(redirectBase);
  } else {
    port = await findAvailablePort();
    redirectUri = buildLocalLinearOAuthRedirectUri(port);
  }

  pendingAuth = {
    codeVerifier,
    state,
    redirectUri,
    port,
    appReturnUrl,
  };

  const authUrl = new URL(LINEAR_AUTHORIZE_URL);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", credentials.client_id);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", LINEAR_OAUTH_SCOPES);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  if (!redirectBase) {
    const port = pendingAuth.port;
    authServer = createServer(async (req, res) => {
      try {
        const requestUrl = new URL(req.url ?? "/", `http://localhost:${port}`);

        if (requestUrl.pathname !== LINEAR_OAUTH_CALLBACK_PATH) {
          sendHtml(
            res,
            404,
            buildOAuthCallbackPageHtml({
              title: "Not found",
              message: "This page does not exist.",
              variant: "error",
              connectProgress: CONNECT_GATE_PROGRESS_INCOMPLETE,
            }),
          );
          return;
        }

        const result = await handleLinearOAuthCallback(requestUrl.searchParams);
        sendHtml(res, result.status, result.html);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Authentication failed";
        sendHtml(
          res,
          500,
          buildOAuthCallbackPageHtml({
            title: "Authentication failed",
            message,
            variant: "error",
            connectProgress: CONNECT_GATE_PROGRESS_INCOMPLETE,
          }),
        );
        await stopLinearOAuthAuth();
      }
    });

    await new Promise<void>((resolve, reject) => {
      authServer!.once("error", reject);
      authServer!.listen(port, () => resolve());
    });
  }

  scheduleAuthTimeout();

  return {
    authUrl: authUrl.toString(),
    localUrl: redirectUri,
  };
}

export function getLinearOAuthAccessToken(): string | undefined {
  if (!isLinearOAuthAuthenticated()) return undefined;

  try {
    const tokenPath = getLinearOAuthTokenPath();
    const parsed = JSON.parse(readFileSync(tokenPath, "utf8")) as Record<string, unknown>;
    const accessToken = parsed.access_token;
    return typeof accessToken === "string" && accessToken.trim() ? accessToken.trim() : undefined;
  } catch {
    return undefined;
  }
}
