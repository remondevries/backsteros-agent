import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

const RESIZING_CLASS = "app-panel-resizing";

function readStoredWidth(storageKey: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveWidthFromContainer({
  container,
  ratio,
  minWidth,
  maxWidth,
  maxWidthRatio,
}: {
  container: HTMLElement | null;
  ratio: number;
  minWidth: number;
  maxWidth: number;
  maxWidthRatio?: number;
}): number {
  if (!container) {
    return minWidth;
  }

  const containerWidth = container.clientWidth;
  const resolvedMax =
    maxWidthRatio != null
      ? Math.min(maxWidth, Math.max(minWidth, containerWidth * maxWidthRatio))
      : maxWidth;
  const target = containerWidth * ratio;
  return clamp(target, minWidth, resolvedMax);
}

export function useResizablePanel({
  side,
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
  containerRef,
  defaultWidthRatio,
  maxWidthRatio,
  resetWidthOnExpand = false,
  expanded = true,
}: {
  side: "left" | "right";
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  containerRef?: RefObject<HTMLElement | null>;
  defaultWidthRatio?: number;
  maxWidthRatio?: number;
  resetWidthOnExpand?: boolean;
  expanded?: boolean;
}) {
  const resolveWidth = useCallback(
    (ratio: number) =>
      resolveWidthFromContainer({
        container: containerRef?.current ?? null,
        ratio,
        minWidth,
        maxWidth,
        maxWidthRatio,
      }),
    [containerRef, maxWidth, maxWidthRatio, minWidth],
  );

  const resolveMaxWidth = useCallback(() => {
    if (maxWidthRatio != null && containerRef?.current) {
      return Math.max(
        minWidth,
        Math.min(maxWidth, containerRef.current.clientWidth * maxWidthRatio),
      );
    }
    return maxWidth;
  }, [containerRef, maxWidth, maxWidthRatio, minWidth]);

  const [width, setWidth] = useState(() => {
    if (defaultWidthRatio != null) {
      return resolveWidthFromContainer({
        container: containerRef?.current ?? null,
        ratio: defaultWidthRatio,
        minWidth,
        maxWidth,
        maxWidthRatio,
      });
    }
    const fallback = resetWidthOnExpand
      ? defaultWidth
      : readStoredWidth(storageKey, defaultWidth);
    return clamp(fallback, minWidth, maxWidth);
  });
  const [isResizing, setIsResizing] = useState(false);
  const widthRef = useRef(width);
  widthRef.current = width;

  const persistWidth = useCallback(
    (nextWidth: number) => {
      if (resetWidthOnExpand) return;
      try {
        localStorage.setItem(storageKey, String(nextWidth));
      } catch {
        // Ignore storage failures.
      }
    },
    [resetWidthOnExpand, storageKey],
  );

  useEffect(() => {
    if (!resetWidthOnExpand || !expanded || defaultWidthRatio == null) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const nextWidth = resolveWidth(defaultWidthRatio);
      widthRef.current = nextWidth;
      setWidth(nextWidth);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [defaultWidthRatio, expanded, resetWidthOnExpand, resolveWidth]);

  const handleResizePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const startWidth = widthRef.current;

      setIsResizing(true);
      document.body.classList.add(RESIZING_CLASS);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const delta =
          side === "left" ? moveEvent.clientX - startX : startX - moveEvent.clientX;
        const nextWidth = clamp(startWidth + delta, minWidth, resolveMaxWidth());
        widthRef.current = nextWidth;
        setWidth(nextWidth);
      };

      const handlePointerUp = () => {
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);
        document.body.classList.remove(RESIZING_CLASS);
        setIsResizing(false);
        persistWidth(widthRef.current);
      };

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
    },
    [maxWidth, minWidth, persistWidth, resolveMaxWidth, side],
  );

  useEffect(() => {
    return () => {
      document.body.classList.remove(RESIZING_CLASS);
    };
  }, []);

  return {
    width,
    isResizing,
    handleResizePointerDown,
  };
}
