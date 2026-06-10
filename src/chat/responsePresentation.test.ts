import { describe, expect, test } from "bun:test";
import {
  canLeaveLoadingPhase,
  isResponseContentReady,
  RESPONSE_CURSOR_MS,
  RESPONSE_LOADER_MIN_MS,
} from "./responsePresentation.ts";

describe("responsePresentation", () => {
  test("waits for content and the minimum loader duration", () => {
    expect(isResponseContentReady("", true)).toBe(false);
    expect(isResponseContentReady("Hello", true)).toBe(true);
    expect(isResponseContentReady("", false)).toBe(true);

    expect(canLeaveLoadingPhase(RESPONSE_LOADER_MIN_MS - 1, "Hello", false)).toBe(false);
    expect(canLeaveLoadingPhase(RESPONSE_LOADER_MIN_MS, "Hello", false)).toBe(true);
    expect(canLeaveLoadingPhase(RESPONSE_LOADER_MIN_MS, "", true)).toBe(false);
  });

  test("uses a half-second cursor phase", () => {
    expect(RESPONSE_CURSOR_MS).toBe(500);
  });
});
