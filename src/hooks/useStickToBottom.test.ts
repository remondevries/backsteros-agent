import { describe, expect, test } from "bun:test";
import {
  DEFAULT_STICK_TO_BOTTOM_THRESHOLD_PX,
  distanceFromBottom,
  isNearBottom,
} from "./useStickToBottom";

describe("useStickToBottom helpers", () => {
  test("distanceFromBottom returns remaining scroll range", () => {
    const element = {
      scrollHeight: 1000,
      scrollTop: 400,
      clientHeight: 500,
    } as HTMLElement;

    expect(distanceFromBottom(element)).toBe(100);
  });

  test("isNearBottom respects the threshold buffer", () => {
    const element = {
      scrollHeight: 1000,
      scrollTop: 400,
      clientHeight: 500,
    } as HTMLElement;

    expect(isNearBottom(element, DEFAULT_STICK_TO_BOTTOM_THRESHOLD_PX)).toBe(true);
    expect(isNearBottom(element, 50)).toBe(false);
  });
});
