import { describe, expect, test } from "bun:test";
import {
  isLinearOAuthUrl,
  resolveLinearOpenUrl,
  setLinearIssueLinkMode,
} from "./linearLink";

describe("linearLink", () => {
  test("detects Linear OAuth authorize URLs", () => {
    expect(isLinearOAuthUrl("https://linear.app/oauth/authorize?client_id=abc")).toBe(true);
    expect(isLinearOAuthUrl("https://linear.app/issue/BOS-1")).toBe(false);
  });

  test("keeps OAuth authorize URLs on https even in internal link mode", () => {
    setLinearIssueLinkMode("internal");
    const authUrl =
      "https://linear.app/oauth/authorize?response_type=code&client_id=abc&redirect_uri=http%3A%2F%2Flocalhost%3A3510%2Flinear%2Foauth%2Fcallback";

    expect(resolveLinearOpenUrl(authUrl)).toBe(authUrl);
  });

  test("still opens issue links in the Linear app when configured", () => {
    setLinearIssueLinkMode("internal");
    expect(resolveLinearOpenUrl("https://linear.app/issue/BOS-1")).toBe(
      "linear://linear.app/issue/BOS-1",
    );
  });
});
