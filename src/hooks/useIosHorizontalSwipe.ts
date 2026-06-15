import { useEffect, useRef, type RefObject } from "react";
import { isSwipeLeft, isSwipeRight } from "../lib/iosHorizontalSwipe";
import { isIosDevice } from "../platform/iosStandalone";

type TouchSession = {
  startX: number;
  startY: number;
};

export function useIosHorizontalSwipe({
  targetRef,
  enabled,
  onSwipeLeft,
  onSwipeRight,
  allowSwipeLeft = true,
  allowSwipeRight = true,
}: {
  targetRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  allowSwipeLeft?: boolean;
  allowSwipeRight?: boolean;
}) {
  const sessionRef = useRef<TouchSession | null>(null);
  const onSwipeLeftRef = useRef(onSwipeLeft);
  const onSwipeRightRef = useRef(onSwipeRight);
  const allowSwipeLeftRef = useRef(allowSwipeLeft);
  const allowSwipeRightRef = useRef(allowSwipeRight);

  onSwipeLeftRef.current = onSwipeLeft;
  onSwipeRightRef.current = onSwipeRight;
  allowSwipeLeftRef.current = allowSwipeLeft;
  allowSwipeRightRef.current = allowSwipeRight;

  useEffect(() => {
    if (!enabled || !isIosDevice()) return;
    const target = targetRef.current;
    if (!target) return;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      sessionRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
      };
    };

    const finishTouch = (event: TouchEvent) => {
      const session = sessionRef.current;
      sessionRef.current = null;
      if (!session) return;

      const touch = event.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - session.startX;
      const deltaY = touch.clientY - session.startY;

      if (allowSwipeLeftRef.current && isSwipeLeft(deltaX, deltaY)) {
        onSwipeLeftRef.current?.();
        return;
      }

      if (allowSwipeRightRef.current && isSwipeRight(deltaX, deltaY)) {
        onSwipeRightRef.current?.();
      }
    };

    const onTouchCancel = () => {
      sessionRef.current = null;
    };

    target.addEventListener("touchstart", onTouchStart, { passive: true });
    target.addEventListener("touchend", finishTouch, { passive: true });
    target.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      target.removeEventListener("touchstart", onTouchStart);
      target.removeEventListener("touchend", finishTouch);
      target.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [enabled, targetRef]);
}
