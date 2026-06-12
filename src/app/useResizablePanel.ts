import { useCallback, useEffect, useRef, useState } from "react";

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

export function useResizablePanel({
  side,
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
}: {
  side: "left" | "right";
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
}) {
  const [width, setWidth] = useState(() =>
    clamp(readStoredWidth(storageKey, defaultWidth), minWidth, maxWidth),
  );
  const [isResizing, setIsResizing] = useState(false);
  const widthRef = useRef(width);
  widthRef.current = width;

  const persistWidth = useCallback(
    (nextWidth: number) => {
      try {
        localStorage.setItem(storageKey, String(nextWidth));
      } catch {
        // Ignore storage failures.
      }
    },
    [storageKey],
  );

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
        const nextWidth = clamp(startWidth + delta, minWidth, maxWidth);
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
    [maxWidth, minWidth, persistWidth, side],
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
