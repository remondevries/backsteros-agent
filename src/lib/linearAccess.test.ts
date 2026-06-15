import { describe, expect, test } from "bun:test";
import {
  isLinearAccessGranted,
  isLinearOAuthAccessGranted,
  isLinearSessionExpiredError,
  LINEAR_SESSION_EXPIRED_MESSAGE,
  formatLinearAccessError,
} from "./linearAccess";
import {
  notifyLinearSessionExpired,
  resetLinearSessionExpiredNotifyState,
  subscribeLinearSessionExpired,
} from "./linearSessionExpired";

describe("isLinearOAuthAccessGranted", () => {
  test("returns true when Linear OAuth auth is present", () => {
    expect(isLinearOAuthAccessGranted({ hasLinearOAuthAuth: true })).toBe(true);
  });

  test("returns false when Linear OAuth auth is missing", () => {
    expect(isLinearOAuthAccessGranted({ hasLinearOAuthAuth: false })).toBe(false);
  });
});

describe("isLinearAccessGranted", () => {
  test("returns true when Linear OAuth auth is present", () => {
    expect(isLinearAccessGranted({ hasLinearOAuthAuth: true })).toBe(true);
  });

  test("returns false when Linear OAuth auth is missing", () => {
    expect(isLinearAccessGranted({ hasLinearOAuthAuth: false })).toBe(false);
  });
});

describe("isLinearSessionExpiredError", () => {
  test("detects auth failures from Linear API", () => {
    expect(isLinearSessionExpiredError("Authentication required, not authenticated")).toBe(true);
    expect(isLinearSessionExpiredError(LINEAR_SESSION_EXPIRED_MESSAGE)).toBe(true);
  });

  test("ignores unrelated errors", () => {
    expect(isLinearSessionExpiredError("project not in same team as issue")).toBe(false);
    expect(isLinearSessionExpiredError("Unauthorized — sign in with your server access token first.")).toBe(
      false,
    );
  });
});

describe("formatLinearAccessError", () => {
  test("formats auth failures and notifies listeners", () => {
    resetLinearSessionExpiredNotifyState();
    let notified = false;
    subscribeLinearSessionExpired(() => {
      notified = true;
    });

    expect(formatLinearAccessError("Authentication required, not authenticated")).toBe(
      LINEAR_SESSION_EXPIRED_MESSAGE,
    );
    expect(notified).toBe(true);
  });
});

describe("notifyLinearSessionExpired", () => {
  test("dedupes rapid notifications", () => {
    resetLinearSessionExpiredNotifyState();
    let count = 0;
    subscribeLinearSessionExpired(() => {
      count += 1;
    });

    notifyLinearSessionExpired("Authentication required, not authenticated");
    notifyLinearSessionExpired("Authentication required, not authenticated");

    expect(count).toBe(1);
  });
});
