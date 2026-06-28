import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import type { MiddlewareHandler } from "hono";
import { isDevelopmentAuthMode } from "./config.ts";

export const SESSION_COOKIE = "backster_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function extractBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader?.startsWith("Bearer ")) return null;
  const token = authorizationHeader.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export function isAuthorizedRequest(
  expectedToken: string,
  authorizationHeader: string | undefined,
  sessionCookie: string | undefined,
): boolean {
  const bearer = extractBearerToken(authorizationHeader);
  if (bearer && bearer === expectedToken) return true;
  if (sessionCookie && sessionCookie === expectedToken) return true;
  return false;
}

export function isEventStreamAuthorized(
  expectedToken: string,
  authorizationHeader: string | undefined,
  sessionCookie: string | undefined,
  authQuery: string | undefined,
): boolean {
  if (isAuthorizedRequest(expectedToken, authorizationHeader, sessionCookie)) {
    return true;
  }
  const queryToken = authQuery?.trim();
  return Boolean(queryToken && queryToken === expectedToken);
}

export function createBearerOrCookieAuth(expectedToken: string): MiddlewareHandler {
  return async (c, next) => {
    const authorized = isAuthorizedRequest(
      expectedToken,
      c.req.header("Authorization"),
      getCookie(c, SESSION_COOKIE),
    );
    if (!authorized) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }
    await next();
  };
}

export function setSessionCookie(c: { header: (name: string, value: string) => void }, token: string) {
  const secure = !isDevelopmentAuthMode();
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(c: { header: (name: string, value: string) => void }) {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}
