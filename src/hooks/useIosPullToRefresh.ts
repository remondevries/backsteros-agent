import { useEffect, useRef, useState, type RefObject } from "react";
import { useContentPanelChrome } from "../app/contentPanelChromeContext";
import { findContentMainScrollTarget } from "../lib/contentMainScroll";
import {
  clampIosPullDistance,
  computeIosPullDownDistance,
  isAtScrollTop,
  shouldTriggerIosPullToRefresh,
} from "../lib/iosPullToRefresh";
import { isIosDevice } from "../platform/iosStandalone";

type TouchSession = {
  startY: number;
  scrollElement: HTMLElement;
};

const REFRESH_COOLDOWN_MS = 800;

export function useIosPullToRefresh(contentRootRef: RefObject<HTMLElement | null>) {
  const { contentPanelBarState } = useContentPanelChrome();
  const [pullDistance, setPullDistance] = useState(0);
  const pullDistanceRef = useRef(0);
  const sessionRef = useRef<TouchSession | null>(null);
  const lastRefreshAtRef = useRef(0);
  const onRefreshRef = useRef(contentPanelBarState?.onRefresh ?? null);
  const refreshingRef = useRef(Boolean(contentPanelBarState?.refreshing));

  onRefreshRef.current = contentPanelBarState?.onRefresh ?? null;
  refreshingRef.current = Boolean(contentPanelBarState?.refreshing);

  useEffect(() => {
    pullDistanceRef.current = pullDistance;
  }, [pullDistance]);

  useEffect(() => {
    if (!isIosDevice()) return;
    const root = contentRootRef.current;
    if (!root) return;

    const resetPull = () => {
      sessionRef.current = null;
      pullDistanceRef.current = 0;
      setPullDistance(0);
    };

    const resolveScrollTarget = (): HTMLElement | null => {
      const scrollElement = findContentMainScrollTarget();
      if (!scrollElement || !root.contains(scrollElement)) return null;
      return scrollElement;
    };

    const onTouchStart = (event: TouchEvent) => {
      if (refreshingRef.current || !onRefreshRef.current) return;
      const touch = event.touches[0];
      if (!touch) return;

      const scrollElement = resolveScrollTarget();
      if (!scrollElement || !isAtScrollTop(scrollElement.scrollTop)) return;

      sessionRef.current = {
        startY: touch.clientY,
        scrollElement,
      };
    };

    const onTouchMove = (event: TouchEvent) => {
      const session = sessionRef.current;
      if (!session) return;
      const touch = event.touches[0];
      if (!touch) return;

      if (!isAtScrollTop(session.scrollElement.scrollTop)) {
        resetPull();
        return;
      }

      const distance = clampIosPullDistance(
        computeIosPullDownDistance(session.startY, touch.clientY),
      );
      pullDistanceRef.current = distance;
      setPullDistance(distance);
    };

    const finishTouch = () => {
      const session = sessionRef.current;
      if (!session) return;

      const shouldRefresh =
        shouldTriggerIosPullToRefresh(pullDistanceRef.current) &&
        isAtScrollTop(session.scrollElement.scrollTop) &&
        !refreshingRef.current &&
        Boolean(onRefreshRef.current) &&
        Date.now() - lastRefreshAtRef.current >= REFRESH_COOLDOWN_MS;

      if (shouldRefresh) {
        lastRefreshAtRef.current = Date.now();
        onRefreshRef.current?.();
      }

      resetPull();
    };

    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: true });
    root.addEventListener("touchend", finishTouch, { passive: true });
    root.addEventListener("touchcancel", finishTouch, { passive: true });

    return () => {
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", finishTouch);
      root.removeEventListener("touchcancel", finishTouch);
    };
  }, [contentRootRef]);

  const refreshing = Boolean(contentPanelBarState?.refreshing);
  const enabled = Boolean(contentPanelBarState?.onRefresh);

  return {
    enabled,
    pullDistance,
    refreshing,
  };
}
