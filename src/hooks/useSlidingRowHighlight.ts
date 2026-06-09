import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export interface SlidingHighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
  borderRadius: string;
}

export interface UseSlidingRowHighlightOptions {
  getBorderRadius?: (item: HTMLButtonElement | null) => string;
}

function rectsEqual(a: SlidingHighlightRect | null, b: SlidingHighlightRect | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height &&
    a.borderRadius === b.borderRadius
  );
}

export function useSlidingRowHighlight(
  selectedIndex: number,
  options: UseSlidingRowHighlightOptions = {},
) {
  const { getBorderRadius } = options;
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [highlightRect, setHighlightRect] = useState<SlidingHighlightRect | null>(null);
  const [highlightReady, setHighlightReady] = useState(false);
  const getBorderRadiusRef = useRef(getBorderRadius);
  getBorderRadiusRef.current = getBorderRadius;

  const syncHighlight = useCallback(() => {
    const list = listRef.current;
    if (selectedIndex < 0 || !list) {
      setHighlightRect((current) => (current === null ? current : null));
      return;
    }

    const item = itemRefs.current[selectedIndex];
    if (!item) {
      setHighlightRect((current) => (current === null ? current : null));
      return;
    }

    const listRect = list.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const borderRadius = getBorderRadiusRef.current?.(item) ?? "6px";
    const nextRect: SlidingHighlightRect = {
      top: itemRect.top - listRect.top + list.scrollTop,
      left: itemRect.left - listRect.left + list.scrollLeft,
      width: itemRect.width,
      height: itemRect.height,
      borderRadius,
    };

    setHighlightRect((current) => (rectsEqual(current, nextRect) ? current : nextRect));
  }, [selectedIndex]);

  useLayoutEffect(() => {
    syncHighlight();
  }, [syncHighlight]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setHighlightReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const handleLayoutChange = () => syncHighlight();
    const resizeObserver = new ResizeObserver(handleLayoutChange);
    resizeObserver.observe(list);
    list.addEventListener("scroll", handleLayoutChange, { passive: true });
    window.addEventListener("resize", handleLayoutChange);

    return () => {
      resizeObserver.disconnect();
      list.removeEventListener("scroll", handleLayoutChange);
      window.removeEventListener("resize", handleLayoutChange);
    };
  }, [syncHighlight]);

  useEffect(() => {
    if (selectedIndex < 0) return;
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const setItemRef = useCallback(
    (index: number) => (element: HTMLButtonElement | null) => {
      itemRefs.current[index] = element;
    },
    [],
  );

  return {
    listRef,
    setItemRef,
    highlightRect,
    highlightReady,
  };
}
