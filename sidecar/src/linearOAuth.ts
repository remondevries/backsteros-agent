import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  getDefaultLinearOAuthCredentialsPath,
  getLinearOAuthCredentialsPath,
  getLinearOAuthTokenPath,
  isLinearOAuthAuthenticated,
  isLinearOAuthConfigured,
} from "./config.ts";

interface OAuthCredentials {
  client_id: string;
  client_secret: string;
}

interface PendingAuthFlow {
  codeVerifier: string;
  state: string;
  redirectUri: string;
  port: number;
}

const PORT_RANGE = { start: 3510, end: 3515 };
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
  const credentialsPath = getLinearOAuthCredentialsPath();
  if (!credentialsPath) {
    throw new Error("Linear OAuth credentials path is missing");
  }

  const keys = JSON.parse(await readFile(credentialsPath, "utf8")) as Record<string, unknown>;

  if (keys.client_id && keys.client_secret) {
    return {
      client_id: String(keys.client_id),
      client_secret: String(keys.client_secret),
    };
  }

  throw new Error("Invalid Linear OAuth credentials file format");
}

async function saveTokens(tokens: Record<string, unknown>) {
  const tokenPath = getLinearOAuthTokenPath();
  await mkdir(dirname(tokenPath), { recursive: true });
  await writeFile(tokenPath, `${JSON.stringify(tokens, null, 2)}\n`, { mode: 0o600 });
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
  return authServer !== null;
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

async function exchangeAuthorizationCode(input: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  credentials: OAuthCredentials;
}): Promise<Record<string, unknown>> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: input.credentials.client_id,
    client_secret: input.credentials.client_secret,
    code_verifier: input.codeVerifier,
  });

  const response = await fetch(LINEAR_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

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

export async function startLinearOAuthAuth(): Promise<{ authUrl: string; localUrl: string }> {
  if (!isLinearOAuthConfigured()) {
    throw new Error("Linear OAuth credentials are not configured");
  }

  if (authServer) {
    throw new Error("Linear authentication is already in progress");
  }

  await stopLinearOAuthAuth();

  const credentials = await loadOAuthCredentials();
  const port = await findAvailablePort();
  const redirectUri = `http://localhost:${port}/callback`;
  const codeVerifier = createCodeVerifier();
  const codeChallenge = createCodeChallenge(codeVerifier);
  const state = randomBytes(32).toString("hex");

  pendingAuth = { codeVerifier, state, redirectUri, port };

  const authUrl = new URL(LINEAR_AUTHORIZE_URL);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", credentials.client_id);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", LINEAR_OAUTH_SCOPES);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  authServer = createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url ?? "/", `http://localhost:${port}`);

      if (requestUrl.pathname !== "/callback") {
        sendHtml(res, 404, "<html><body><p>Not found</p></body></html>");
        return;
      }

      const code = requestUrl.searchParams.get("code");
      const returnedState = requestUrl.searchParams.get("state");
      const flow = pendingAuth;

      if (!code) {
        sendHtml(res, 400, "<html><body><p>Authorization code missing.</p></body></html>");
        return;
      }

      if (!flow || !returnedState || returnedState !== flow.state) {
        sendHtml(
          res,
          403,
          "<html><body><p>This sign-in link expired. Return to BacksterOS Agent and click Connect Linear again.</p></body></html>",
        );
        return;
      }

      const tokens = await exchangeAuthorizationCode({
        code,
        redirectUri: flow.redirectUri,
        codeVerifier: flow.codeVerifier,
        credentials,
      });

      await saveTokens(tokens);

      sendHtml(
        res,
        200,
        "<html><body><h1>Linear connected</h1><p>You can close this tab and return to BacksterOS Agent.</p></body></html>",
      );

      await stopLinearOAuthAuth();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      sendHtml(
        res,
        500,
        `<html><body><h1>Authentication failed</h1><p>${message}</p></body></html>`,
      );
      await stopLinearOAuthAuth();
    }
  });

  await new Promise<void>((resolve, reject) => {
    authServer!.once("error", reject);
    authServer!.listen(port, () => resolve());
  });

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
