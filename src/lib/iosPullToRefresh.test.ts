import { describe, expect, test } from "bun:test";
import {
  clampIosPullDistance,
  computeIosPullDownDistance,
  iosPullToRefreshProgress,
  isAtScrollTop,
  IOS_PULL_TO_REFRESH_MAX_DISTANCE_PX,
  IOS_PULL_TO_REFRESH_THRESHOLD_PX,
  shouldTriggerIosPullToRefresh,
} from "./iosPullToRefresh";

describe("iosPullToRefresh", () => {
  test("isAtScrollTop allows small rubber-band offsets", () => {
    expect(isAtScrollTop(0)).toBe(true);
    expect(isAtScrollTop(2)).toBe(true);
    expect(isAtScrollTop(3)).toBe(false);
  });

  test("computeIosPullDownDistance ignores upward movement", () => {
    expect(computeIosPullDownDistance(100, 140)).toBe(40);
    expect(computeIosPullDownDistance(100, 80)).toBe(0);
  });

  test("clampIosPullDistance caps pull distance", () => {
    expect(clampIosPullDistance(IOS_PULL_TO_REFRESH_MAX_DISTANCE_PX + 20)).toBe(
      IOS_PULL_TO_REFRESH_MAX_DISTANCE_PX,
    );
  });

  test("shouldTriggerIosPullToRefresh respects threshold", () => {
    expect(shouldTriggerIosPullToRefresh(IOS_PULL_TO_REFRESH_THRESHOLD_PX - 1)).toBe(false);
    expect(shouldTriggerIosPullToRefresh(IOS_PULL_TO_REFRESH_THRESHOLD_PX)).toBe(true);
  });

  test("iosPullToRefreshProgress scales to 1 at threshold", () => {
    expect(iosPullToRefreshProgress(0)).toBe(0);
    expect(iosPullToRefreshProgress(IOS_PULL_TO_REFRESH_THRESHOLD_PX / 2)).toBe(0.5);
    expect(iosPullToRefreshProgress(IOS_PULL_TO_REFRESH_THRESHOLD_PX)).toBe(1);
    expect(iosPullToRefreshProgress(IOS_PULL_TO_REFRESH_THRESHOLD_PX * 2)).toBe(1);
  });
});
