export const IOS_KEYBOARD_VISIBLE_THRESHOLD_PX = 8;

/** How far the layout viewport extends below the visual viewport (software keyboard). */
export function computeIosKeyboardLayoutOffsetPx(
  layoutHeight: number,
  viewportOffsetTop: number,
  viewportHeight: number,
): number {
  const visibleBottom = viewportOffsetTop + viewportHeight;
  const bottomGap = Math.max(0, layoutHeight - visibleBottom);
  const heightGap = Math.max(0, layoutHeight - viewportHeight - viewportOffsetTop);
  return Math.max(bottomGap, Math.round(heightGap));
}

export function isIosKeyboardOffsetVisible(offsetPx: number): boolean {
  return offsetPx > IOS_KEYBOARD_VISIBLE_THRESHOLD_PX;
}

export function readIosKeyboardLayoutOffsetPx(): number {
  if (typeof window === "undefined") return 0;
  const viewport = window.visualViewport;
  if (!viewport) return 0;
  return computeIosKeyboardLayoutOffsetPx(
    window.innerHeight,
    viewport.offsetTop,
    viewport.height,
  );
}
