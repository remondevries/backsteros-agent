import { describe, expect, test } from "bun:test";
import {
  getLinearOAuthPrimaryRedirectUri,
  getLinearOAuthRedirectUris,
  resolveLinearOAuthCallbackBase,
  usesPublicLinearOAuthCallback,
} from "./linearOAuth.ts";

describe("linearOAuth redirect URIs", () => {
  test("uses the Linear OAuth callback path on localhost", () => {
    expect(getLinearOAuthPrimaryRedirectUri()).toBe(
      "http://localhost:3510/linear/oauth/callback",
    );
  });

  test("lists fallback redirect URIs for the local port range", () => {
    expect(getLinearOAuthRedirectUris()).toEqual([
      "http://localhost:3510/linear/oauth/callback",
      "http://localhost:3511/linear/oauth/callback",
      "http://localhost:3512/linear/oauth/callback",
      "http://localhost:3513/linear/oauth/callback",
      "http://localhost:3514/linear/oauth/callback",
      "http://localhost:3515/linear/oauth/callback",
    ]);
  });

  test("uses Vite dev origin when app return URL is localhost:5173", () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    try {
      expect(resolveLinearOAuthCallbackBase("http://localhost:5173")).toBe(
        "http://localhost:5173",
      );
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });

  test("uses public callback URL when ALLOWED_ORIGINS is HTTPS in production", () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousOrigins = process.env.ALLOWED_ORIGINS;
    process.env.NODE_ENV = "production";
    process.env.ALLOWED_ORIGINS = "https://staging.backsteros.com";

    try {
      expect(usesPublicLinearOAuthCallback()).toBe(true);
      expect(getLinearOAuthRedirectUris()).toEqual([
        "https://staging.backsteros.com/linear/oauth/callback",
      ]);
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      process.env.ALLOWED_ORIGINS = previousOrigins;
    }
  });
});
