import { describe, expect, test } from "bun:test";
import { isLinearAccessGranted, isLinearOAuthAccessGranted } from "./linearAccess";

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
