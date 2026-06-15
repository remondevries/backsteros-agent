import { useMemo, type RefObject } from "react";
import { RefreshIcon } from "./RefreshIcon";
import { useIosPullToRefresh } from "../hooks/useIosPullToRefresh";
import { iosPullToRefreshProgress } from "../lib/iosPullToRefresh";
import { isIosDevice } from "../platform/iosStandalone";

export function IosPullToRefreshIndicator({
  contentRootRef,
}: {
  contentRootRef: RefObject<HTMLElement | null>;
}) {
  const { enabled, pullDistance, refreshing } = useIosPullToRefresh(contentRootRef);

  const visible = enabled && (refreshing || pullDistance > 0);
  const progress = useMemo(() => iosPullToRefreshProgress(pullDistance), [pullDistance]);

  if (!isIosDevice() || !visible) {
    return null;
  }

  const offsetY = refreshing ? 28 : Math.min(28, pullDistance * 0.45);
  const opacity = refreshing ? 1 : 0.35 + progress * 0.65;

  return (
    <div
      className="ios-pull-to-refresh"
      aria-hidden={!refreshing}
      aria-live={refreshing ? "polite" : undefined}
      style={{
        transform: `translate(-50%, ${offsetY}px)`,
        opacity,
      }}
    >
      <RefreshIcon spinning={refreshing} />
    </div>
  );
}
