export const IOS_HORIZONTAL_SWIPE_THRESHOLD_PX = 56;

export function isHorizontalSwipe(
  deltaX: number,
  deltaY: number,
  ratio = 1.35,
): boolean {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  if (absX < IOS_HORIZONTAL_SWIPE_THRESHOLD_PX) return false;
  return absX >= absY * ratio;
}

export function isSwipeLeft(deltaX: number, deltaY: number): boolean {
  return deltaX < 0 && isHorizontalSwipe(deltaX, deltaY);
}

export function isSwipeRight(deltaX: number, deltaY: number): boolean {
  return deltaX > 0 && isHorizontalSwipe(deltaX, deltaY);
}
