import { randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";
import {
  getGoogleCalendarAccountId,
  getGoogleCalendarTokenPath,
  getGoogleOAuthCredentialsPath,
  isGoogleCalendarConfigured,
} from "./config.ts";

interface OAuthCredentials {
  client_id: string;
  client_secret: string;
}

interface PendingAuthFlow {
  codeVerifier: string;
  state: string;
  client: OAuth2Client;
  port: number;
}

const PORT_RANGE = { start: 3500, end: 3505 };
const AUTH_TIMEOUT_MS = 10 * 60 * 1000;

let authServer: Server | null = null;
let pendingAuth: PendingAuthFlow | null = null;
let authTimeout: ReturnType<typeof setTimeout> | null = null;

async function loadOAuthCredentials(): Promise<OAuthCredentials> {
  const credentialsPath = getGoogleOAuthCredentialsPath();
  if (!credentialsPath) {
    throw new Error("Google OAuth credentials path is missing");
  }

  const keys = JSON.parse(await readFile(credentialsPath, "utf8")) as Record<string, unknown>;
  const installed =
    keys.installed && typeof keys.installed === "object"
      ? (keys.installed as Record<string, unknown>)
      : null;

  if (installed?.client_id && installed.client_secret) {
    return {
      client_id: String(installed.client_id),
      client_secret: String(installed.client_secret),
    };
  }

  if (keys.client_id && keys.client_secret) {
    return {
      client_id: String(keys.client_id),
      client_secret: String(keys.client_secret),
    };
  }

  throw new Error('Invalid Google OAuth credentials file format');
}

async function saveAccountTokens(accountId: string, tokens: Record<string, unknown>) {
  const tokenPath = getGoogleCalendarTokenPath();
  let existing: Record<string, unknown> = {};

  try {
    existing = JSON.parse(await readFile(tokenPath, "utf8")) as Record<string, unknown>;
  } catch {
    existing = {};
  }

  if (existing.access_token || existing.refresh_token) {
    existing = { normal: existing };
  }

  existing[accountId] = tokens;
  await mkdir(dirname(tokenPath), { recursive: true });
  await writeFile(tokenPath, `${JSON.stringify(existing, null, 2)}\n`, { mode: 0o600 });
}

function clearAuthTimeout() {
  if (!authTimeout) return;
  clearTimeout(authTimeout);
  authTimeout = null;
}

function scheduleAuthTimeout() {
  clearAuthTimeout();
  authTimeout = setTimeout(() => {
    void stopGoogleCalendarAuth();
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
    `No available port found for Google Calendar OAuth (${PORT_RANGE.start}-${PORT_RANGE.end})`,
  );
}

function sendHtml(res: import("node:http").ServerResponse, status: number, body: string) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(body);
}

export function isGoogleCalendarAuthRunning(): boolean {
  return authServer !== null;
}

export async function stopGoogleCalendarAuth(): Promise<void> {
  clearAuthTimeout();
  pendingAuth = null;

  if (!authServer) return;

  await new Promise<void>((resolve) => {
    authServer!.close(() => resolve());
  });
  authServer = null;
}

export async function startGoogleCalendarAuth(): Promise<{ authUrl: string; localUrl: string }> {
  if (!isGoogleCalendarConfigured()) {
    throw new Error("Google OAuth credentials are not configured");
  }

  if (authServer) {
    throw new Error("Google Calendar authentication is already in progress");
  }

  await stopGoogleCalendarAuth();

  const credentials = await loadOAuthCredentials();
  const accountId = getGoogleCalendarAccountId();
  const port = await findAvailablePort();
  const redirectUri = `http://localhost:${port}/oauth2callback`;

  const client = new OAuth2Client({
    clientId: credentials.client_id,
    clientSecret: credentials.client_secret,
    redirectUri,
  });

  const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
  if (!codeChallenge) {
    throw new Error("Failed to generate PKCE code challenge");
  }

  const state = randomBytes(32).toString("hex");
  pendingAuth = { codeVerifier, state, client, port };

  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar"],
    prompt: "consent",
    code_challenge_method: CodeChallengeMethod.S256,
    code_challenge: codeChallenge,
    state,
  });

  authServer = createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url ?? "/", `http://localhost:${port}`);

      if (requestUrl.pathname !== "/oauth2callback") {
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
          "<html><body><p>This sign-in link expired. Return to BacksterOS Agent and click Connect Google Calendar again.</p></body></html>",
        );
        return;
      }

      const { tokens } = await flow.client.getToken({
        code,
        codeVerifier: flow.codeVerifier,
      });

      await saveAccountTokens(accountId, tokens as Record<string, unknown>);

      sendHtml(
        res,
        200,
        "<html><body><h1>Google Calendar connected</h1><p>You can close this tab and return to BacksterOS Agent.</p></body></html>",
      );

      await stopGoogleCalendarAuth();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      sendHtml(
        res,
        500,
        `<html><body><h1>Authentication failed</h1><p>${message}</p></body></html>`,
      );
      await stopGoogleCalendarAuth();
    }
  });

  await new Promise<void>((resolve, reject) => {
    authServer!.once("error", reject);
    authServer!.listen(port, () => resolve());
  });

  scheduleAuthTimeout();

  return {
    authUrl,
    localUrl: redirectUri,
  };
}
