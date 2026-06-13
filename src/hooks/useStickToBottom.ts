import { useCallback, useEffect, useRef, useState } from "react";

export const DEFAULT_STICK_TO_BOTTOM_THRESHOLD_PX = 120;

/** Milliseconds to ignore scroll events after a programmatic scroll. */
const PROGRAMMATIC_SCROLL_IGNORE_MS = 150;

export function distanceFromBottom(element: HTMLElement): number {
  return element.scrollHeight - element.scrollTop - element.clientHeight;
}

export function isNearBottom(element: HTMLElement, thresholdPx: number): boolean {
  return distanceFromBottom(element) <= thresholdPx;
}

export function useStickToBottom(options?: {
  enabled?: boolean;
  thresholdPx?: number;
}) {
  const enabled = options?.enabled ?? true;
  const thresholdPx = options?.thresholdPx ?? DEFAULT_STICK_TO_BOTTOM_THRESHOLD_PX;

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const ignoreScrollUntilRef = useRef(0);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const element = scrollRef.current;
    if (!element) return;

    ignoreScrollUntilRef.current = performance.now() + PROGRAMMATIC_SCROLL_IGNORE_MS;
    element.scrollTo({ top: element.scrollHeight, behavior });
    if (behavior === "auto") {
      element.scrollTop = element.scrollHeight;
    }
  }, []);

  const updatePinnedFromScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    if (performance.now() < ignoreScrollUntilRef.current) {
      return;
    }

    const pinned = isNearBottom(element, thresholdPx);
    pinnedRef.current = pinned;
    setShowScrollButton(!pinned);
  }, [thresholdPx]);

  const pin = useCallback(() => {
    pinnedRef.current = true;
    setShowScrollButton(false);
    scrollToBottom("auto");
  }, [scrollToBottom]);

  const handleScroll = useCallback(() => {
    updatePinnedFromScroll();
  }, [updatePinnedFromScroll]);

  useEffect(() => {
    if (!enabled) return undefined;

    const content = contentRef.current;
    if (!content) return undefined;

    const observer = new ResizeObserver(() => {
      if (!pinnedRef.current) return;
      scrollToBottom("auto");
    });

    observer.observe(content);
    return () => observer.disconnect();
  }, [enabled, scrollToBottom]);

  useEffect(() => {
    if (!enabled || !pinnedRef.current) return;
    scrollToBottom("auto");
  }, [enabled, scrollToBottom]);

  return {
    scrollRef,
    contentRef,
    handleScroll,
    scrollToBottom,
    pin,
    showScrollButton,
    isPinned: () => pinnedRef.current,
  };
}
