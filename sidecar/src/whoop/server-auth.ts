import { randomUUID } from "node:crypto";
import { getTotemEnvPath } from "../config.ts";
import { saveWhoopCredentials } from "../integrations-secrets.ts";

const SESSION_TTL_MS = 10 * 60 * 1000;

type WhoopAuthSessionStatus = "pending" | "mfa" | "complete" | "error";

interface WhoopAuthSession {
  id: string;
  email: string;
  status: WhoopAuthSessionStatus;
  createdAt: number;
  mfaChallengeName?: string;
  error?: string;
  completePromise: Promise<void>;
  mfaResolver?: (code: string) => void;
  mfaReject?: (error: Error) => void;
}

const sessions = new Map<string, WhoopAuthSession>();

function purgeExpiredSessions(now = Date.now()): void {
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      session.mfaReject?.(new Error("Whoop sign-in session expired"));
      sessions.delete(id);
    }
  }
}

async function loadTotemCognito() {
  return import("@briangaoo/totem/dist/whoop/cognito.js") as Promise<{
    bootstrapCognito: (input: {
      email: string;
      password: string;
      mfaPrompt: () => Promise<string>;
    }) => Promise<{
      accessToken: string;
      refreshToken: string;
      idToken: string;
      expiresAt: number;
    }>;
    refreshCognitoSession: (
      email: string,
      refreshToken: string,
    ) => Promise<{
      accessToken: string;
      refreshToken: string;
      idToken: string;
      expiresAt: number;
    }>;
  }>;
}

async function loadTotemInstallation() {
  return import("@briangaoo/totem/dist/whoop/installation.js") as Promise<{
    resolveInstallationId: (envPath: string) => string;
  }>;
}

async function finalizeWhoopAuth(
  email: string,
  tokens: { accessToken: string; refreshToken: string },
): Promise<void> {
  const { refreshCognitoSession } = await loadTotemCognito();

  let access = tokens.accessToken;
  let refresh = tokens.refreshToken;

  try {
    const refreshed = await refreshCognitoSession(email, refresh);
    if (refreshed.accessToken) {
      access = refreshed.accessToken;
      refresh = refreshed.refreshToken || refresh;
    }
  } catch {
    // Optional verification — tokens from bootstrap are still usable.
  }

  let userId: string | undefined;
  try {
    const response = await fetch("https://api.prod.whoop.com/users-service/v2/bootstrap?apiVersion=7", {
      headers: { authorization: `bearer ${access}`, accept: "application/json" },
    });
    if (response.ok) {
      const payload = (await response.json()) as { user?: { id?: number } };
      if (payload.user?.id != null) {
        userId = String(payload.user.id);
      }
    }
  } catch {
    // user id is optional for first connection test
  }

  saveWhoopCredentials({
    email,
    iosBearerToken: access,
    cognitoRefreshToken: refresh,
    userId: userId ?? null,
    installationId: null,
  });

  const { resolveInstallationId } = await loadTotemInstallation();
  resolveInstallationId(getTotemEnvPath());
}

function createSession(email: string, password: string): WhoopAuthSession {
  purgeExpiredSessions();

  const id = randomUUID();
  let completeResolve!: () => void;
  let completeReject!: (error: Error) => void;
  const completePromise = new Promise<void>((resolve, reject) => {
    completeResolve = resolve;
    completeReject = reject;
  });

  const session: WhoopAuthSession = {
    id,
    email,
    status: "pending",
    createdAt: Date.now(),
    completePromise,
  };

  void (async () => {
    try {
      const { bootstrapCognito } = await loadTotemCognito();
      const tokens = await bootstrapCognito({
        email,
        password,
        mfaPrompt: async () => {
          session.status = "mfa";
          session.mfaChallengeName = session.mfaChallengeName ?? "SMS_MFA";
          return await new Promise<string>((resolve, reject) => {
            session.mfaResolver = resolve;
            session.mfaReject = reject;
          });
        },
      });
      await finalizeWhoopAuth(email, tokens);
      session.status = "complete";
      completeResolve();
    } catch (error) {
      session.status = "error";
      session.error = error instanceof Error ? error.message : "Whoop sign-in failed";
      completeReject(error instanceof Error ? error : new Error(session.error));
    } finally {
      setTimeout(() => {
        sessions.delete(id);
      }, SESSION_TTL_MS);
    }
  })();

  sessions.set(id, session);
  return session;
}

async function waitForSessionStatus(
  session: WhoopAuthSession,
  targets: WhoopAuthSessionStatus[],
  timeoutMs = 30_000,
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (targets.includes(session.status)) return;
    if (session.status === "error") {
      throw new Error(session.error ?? "Whoop sign-in failed");
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Whoop sign-in timed out");
}

export type WhoopAuthStartResult =
  | { status: "connected" }
  | { status: "mfa_required"; authSessionId: string; challengeName: string };

export async function startWhoopAuth(email: string, password: string): Promise<WhoopAuthStartResult> {
  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();
  if (!trimmedEmail || !trimmedPassword) {
    throw new Error("Whoop email and password are required");
  }

  const session = createSession(trimmedEmail, trimmedPassword);

  await waitForSessionStatus(session, ["mfa", "complete", "error"]);

  if (session.status === "complete") {
    return { status: "connected" };
  }

  if (session.status === "mfa") {
    return {
      status: "mfa_required",
      authSessionId: session.id,
      challengeName: session.mfaChallengeName ?? "SMS_MFA",
    };
  }

  throw new Error(session.error ?? "Whoop sign-in failed");
}

export async function completeWhoopAuthMfa(
  authSessionId: string,
  code: string,
): Promise<{ status: "connected" }> {
  purgeExpiredSessions();
  const session = sessions.get(authSessionId);
  if (!session) {
    throw new Error("Whoop sign-in session expired — start again");
  }
  if (session.status !== "mfa") {
    throw new Error("No MFA challenge is pending for this session");
  }

  const trimmedCode = code.trim();
  if (!trimmedCode) {
    throw new Error("MFA code is required");
  }

  session.mfaResolver?.(trimmedCode);

  try {
    await session.completePromise;
  } catch (error) {
    throw error instanceof Error ? error : new Error("Whoop MFA verification failed");
  }

  if (session.status !== "complete") {
    throw new Error(session.error ?? "Whoop MFA verification failed");
  }

  return { status: "connected" };
}

/** Test helper */
export function resetWhoopAuthSessionsForTests(): void {
  sessions.clear();
}
