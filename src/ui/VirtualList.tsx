import { useVirtualizer, type VirtualizerOptions } from "@tanstack/react-virtual";
import { useRef, type ReactNode, type RefObject } from "react";

type VirtualListProps<T> = {
  items: T[];
  estimateSize?: number | ((index: number) => number);
  overscan?: number;
  scrollElementRef?: RefObject<HTMLElement | null>;
  className?: string;
  innerClassName?: string;
  renderItem: (item: T, index: number) => ReactNode;
  getItemKey?: (item: T, index: number) => string | number;
  enabled?: boolean;
};

export function VirtualList<T>({
  items,
  estimateSize = 72,
  overscan = 8,
  scrollElementRef,
  className,
  innerClassName,
  renderItem,
  getItemKey,
  enabled = true,
}: VirtualListProps<T>) {
  const fallbackScrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: enabled ? items.length : 0,
    getScrollElement: () => scrollElementRef?.current ?? fallbackScrollRef.current,
    estimateSize: typeof estimateSize === "number" ? () => estimateSize : estimateSize,
    overscan,
    getItemKey: getItemKey
      ? (index) => getItemKey(items[index] as T, index)
      : undefined,
  } satisfies Partial<VirtualizerOptions<HTMLElement, Element>>);

  if (!enabled || items.length === 0) {
    return null;
  }

  const useExternalScroll = Boolean(scrollElementRef);

  return (
    <div
      ref={useExternalScroll ? undefined : fallbackScrollRef}
      className={className}
      style={useExternalScroll ? undefined : { overflow: "auto", maxHeight: "100%" }}
    >
      <div
        className={innerClassName}
        style={{
          height: virtualizer.getTotalSize(),
          position: "relative",
          width: "100%",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderItem(items[virtualRow.index] as T, virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function useVirtualListEnabled(itemCount: number, threshold = 40) {
  return itemCount >= threshold;
}
