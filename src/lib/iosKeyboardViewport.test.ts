import { describe, expect, test } from "bun:test";
import {
  computeIosKeyboardLayoutOffsetPx,
  isIosKeyboardOffsetVisible,
  IOS_KEYBOARD_VISIBLE_THRESHOLD_PX,
} from "./iosKeyboardViewport";

describe("iosKeyboardViewport", () => {
  test("returns zero when visual viewport matches layout height", () => {
    expect(computeIosKeyboardLayoutOffsetPx(800, 0, 800)).toBe(0);
  });

  test("detects keyboard from reduced visual viewport height", () => {
    const offset = computeIosKeyboardLayoutOffsetPx(800, 0, 500);
    expect(offset).toBe(300);
    expect(isIosKeyboardOffsetVisible(offset)).toBe(true);
  });

  test("detects keyboard from visual viewport offset top", () => {
    const offset = computeIosKeyboardLayoutOffsetPx(800, 120, 500);
    expect(offset).toBe(180);
    expect(isIosKeyboardOffsetVisible(offset)).toBe(true);
  });

  test("threshold treats small layout shifts as keyboard closed", () => {
    expect(isIosKeyboardOffsetVisible(IOS_KEYBOARD_VISIBLE_THRESHOLD_PX)).toBe(false);
    expect(isIosKeyboardOffsetVisible(IOS_KEYBOARD_VISIBLE_THRESHOLD_PX + 1)).toBe(true);
  });
});
