import { type CSSProperties } from "react";
import type { WhoopSnapshotEntity } from "./types";
import {
  WHOOP_METRIC_COLORS,
  WHOOP_METRIC_MAX,
  WHOOP_METRIC_RING_CIRCUMFERENCE,
  formatWhoopRingValue,
  whoopValueToDash,
} from "./whoopMetrics";

const MINI_RING_STROKE_WIDTH = 2;

function WhoopMetricMiniRing({
  value,
  max,
  color,
  displayValue,
  title,
}: {
  value: number | null | undefined;
  max: number;
  color: string;
  displayValue: string;
  title: string;
}) {
  const dashLength = whoopValueToDash(value, max);
  const dashOffset = WHOOP_METRIC_RING_CIRCUMFERENCE - dashLength;
  const compactValue = displayValue.includes(".");

  return (
    <span
      className="whoop-metric-mini-ring"
      style={{ "--whoop-metric-ring-color": color } as CSSProperties}
      title={title}
      aria-label={title}
    >
      <svg className="whoop-metric-mini-ring-svg" viewBox="0 0 24 24" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="currentColor"
          strokeWidth={MINI_RING_STROKE_WIDTH}
          className="whoop-metric-mini-ring-track"
        />
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="currentColor"
          strokeWidth={MINI_RING_STROKE_WIDTH}
          strokeDasharray={`${WHOOP_METRIC_RING_CIRCUMFERENCE} ${WHOOP_METRIC_RING_CIRCUMFERENCE}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="whoop-metric-mini-ring-fill"
        />
      </svg>
      <span
        className={`whoop-metric-mini-ring-value${compactValue ? " whoop-metric-mini-ring-value-compact" : ""}`}
      >
        {displayValue}
      </span>
    </span>
  );
}

export function WhoopMetricDots({ snapshot }: { snapshot: WhoopSnapshotEntity }) {
  const metrics = [
    {
      key: "sleep",
      value: snapshot.sleepPerformance,
      max: WHOOP_METRIC_MAX.sleep,
      digits: 0 as const,
      color: WHOOP_METRIC_COLORS.sleep,
      label: "Sleep",
    },
    {
      key: "recovery",
      value: snapshot.recoveryScore,
      max: WHOOP_METRIC_MAX.recovery,
      digits: 0 as const,
      color: WHOOP_METRIC_COLORS.recovery,
      label: "Recovery",
    },
    {
      key: "strain",
      value: snapshot.strainScore,
      max: WHOOP_METRIC_MAX.strain,
      digits: 1 as const,
      color: WHOOP_METRIC_COLORS.strain,
      label: "Strain",
    },
  ] as const;

  return (
    <span className="whoop-metric-dots">
      {metrics.map((metric) => {
        const displayValue = formatWhoopRingValue(metric.value, metric.max, metric.digits);
        const title = `${metric.label} ${displayValue}`;

        return (
          <WhoopMetricMiniRing
            key={metric.key}
            value={metric.value}
            max={metric.max}
            color={metric.color}
            displayValue={displayValue}
            title={title}
          />
        );
      })}
    </span>
  );
}
