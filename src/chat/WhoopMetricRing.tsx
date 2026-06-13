import { useEffect, useState, type CSSProperties } from "react";
import {
  WHOOP_METRIC_RING_CIRCUMFERENCE,
  whoopValueToDash,
} from "./whoopMetrics";

const RING_STROKE_WIDTH = 3;

function WhoopMetricRingCircle({
  dashLength,
  targetDashLength,
  animate,
}: {
  dashLength: number;
  targetDashLength?: number;
  animate: boolean;
}) {
  const dashOffset = WHOOP_METRIC_RING_CIRCUMFERENCE - dashLength;
  const targetOffset =
    targetDashLength != null
      ? WHOOP_METRIC_RING_CIRCUMFERENCE - targetDashLength
      : null;

  return (
    <svg
      className="whoop-metric-ring-svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth={RING_STROKE_WIDTH}
        className="whoop-metric-ring-track"
      />
      {targetDashLength != null && targetDashLength > 0 && targetOffset != null && (
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="currentColor"
          strokeWidth={RING_STROKE_WIDTH}
          strokeDasharray={`${WHOOP_METRIC_RING_CIRCUMFERENCE} ${WHOOP_METRIC_RING_CIRCUMFERENCE}`}
          strokeDashoffset={targetOffset}
          strokeLinecap="round"
          className={`whoop-metric-ring-target-fill${animate ? " whoop-metric-ring-fill-animate" : ""}`}
        />
      )}
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth={RING_STROKE_WIDTH}
        strokeDasharray={`${WHOOP_METRIC_RING_CIRCUMFERENCE} ${WHOOP_METRIC_RING_CIRCUMFERENCE}`}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        className={`whoop-metric-ring-fill${animate ? " whoop-metric-ring-fill-animate" : ""}`}
      />
    </svg>
  );
}

export function WhoopMetricRing({
  label,
  value,
  targetValue,
  max,
  ringColor,
  displayValue,
  title,
  className,
  valueClassName,
  animateFill = true,
}: {
  label: string;
  value: number | null | undefined;
  targetValue?: number | null;
  max: number;
  ringColor: string;
  displayValue: string;
  title?: string;
  className?: string;
  valueClassName?: string;
  /**
   * When true (default) the ring fill animates between values via a CSS
   * transition. Set to false when the caller already drives `value` with its
   * own per-frame animation, so the ring tracks that value exactly instead of
   * lagging behind it with a second, compounding transition.
   */
  animateFill?: boolean;
}) {
  const dashLength = whoopValueToDash(value, max);
  const targetDashLength =
    targetValue != null ? whoopValueToDash(targetValue, max) : undefined;
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!animateFill) return;
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [value, targetValue, max, animateFill]);

  const fillAnimate = animateFill && animate;

  return (
    <div className={`whoop-metric-ring-item${className ? ` ${className}` : ""}`} title={title}>
      <div
        className="whoop-metric-ring-badge"
        style={{ "--whoop-metric-ring-color": ringColor } as CSSProperties}
      >
        <WhoopMetricRingCircle
          dashLength={dashLength}
          targetDashLength={targetDashLength}
          animate={fillAnimate}
        />
        <span
          className={[
            "whoop-metric-ring-value",
            valueClassName ?? null,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {displayValue}
        </span>
      </div>
      <span className="whoop-metric-ring-label">{label}</span>
    </div>
  );
}
