import { afterEach, describe, expect, test } from "bun:test";
import {
  completeWhoopAuthMfa,
  resetWhoopAuthSessionsForTests,
  startWhoopAuth,
} from "./server-auth.ts";

describe("whoop server-auth", () => {
  afterEach(() => {
    resetWhoopAuthSessionsForTests();
  });

  test("startWhoopAuth rejects missing credentials", async () => {
    await expect(startWhoopAuth("", "")).rejects.toThrow("email and password are required");
  });

  test("completeWhoopAuthMfa rejects unknown session", async () => {
    await expect(completeWhoopAuthMfa("missing-session", "123456")).rejects.toThrow("expired");
  });
});
