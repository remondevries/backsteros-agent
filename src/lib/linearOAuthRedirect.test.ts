import { describe, expect, test } from "bun:test";
import {
  LINEAR_OAUTH_PRIMARY_REDIRECT_URI,
  getLinearOAuthRedirectUris,
} from "./linearOAuthRedirect";

describe("linearOAuthRedirect", () => {
  test("uses the Linear OAuth callback path on localhost", () => {
    expect(LINEAR_OAUTH_PRIMARY_REDIRECT_URI).toBe(
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
});
