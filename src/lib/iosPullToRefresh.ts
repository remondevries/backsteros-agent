export const IOS_PULL_TO_REFRESH_THRESHOLD_PX = 72;
export const IOS_PULL_TO_REFRESH_MAX_DISTANCE_PX = 120;

/** Allow a small scrollTop tolerance for sub-pixel / rubber-band positions at the top. */
export const IOS_PULL_TO_REFRESH_TOP_TOLERANCE_PX = 2;

export function isAtScrollTop(scrollTop: number, tolerance = IOS_PULL_TO_REFRESH_TOP_TOLERANCE_PX): boolean {
  return scrollTop <= tolerance;
}

export function computeIosPullDownDistance(startY: number, currentY: number): number {
  return Math.max(0, currentY - startY);
}

export function clampIosPullDistance(distance: number): number {
  return Math.min(distance, IOS_PULL_TO_REFRESH_MAX_DISTANCE_PX);
}

export function shouldTriggerIosPullToRefresh(
  pullDistance: number,
  threshold = IOS_PULL_TO_REFRESH_THRESHOLD_PX,
): boolean {
  return pullDistance >= threshold;
}

export function iosPullToRefreshProgress(
  pullDistance: number,
  threshold = IOS_PULL_TO_REFRESH_THRESHOLD_PX,
): number {
  if (threshold <= 0) return 0;
  return Math.min(1, pullDistance / threshold);
}
