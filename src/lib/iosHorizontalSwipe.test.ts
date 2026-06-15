import { describe, expect, test } from "bun:test";
import { isSwipeLeft, isSwipeRight } from "./iosHorizontalSwipe";

describe("iosHorizontalSwipe", () => {
  test("detects left swipes with dominant horizontal movement", () => {
    expect(isSwipeLeft(-60, 10)).toBe(true);
    expect(isSwipeLeft(-60, 50)).toBe(false);
    expect(isSwipeLeft(60, 10)).toBe(false);
  });

  test("detects right swipes with dominant horizontal movement", () => {
    expect(isSwipeRight(60, 10)).toBe(true);
    expect(isSwipeRight(60, 50)).toBe(false);
    expect(isSwipeRight(-60, 10)).toBe(false);
  });
});
