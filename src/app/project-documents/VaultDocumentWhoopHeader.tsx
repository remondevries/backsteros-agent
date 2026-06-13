import { useEffect, useState } from "react";
import { WhoopMetricRing } from "../../chat/WhoopMetricRing";
import type { WhoopSnapshotEntity } from "../../chat/types";
import {
  WHOOP_METRIC_COLORS,
  WHOOP_METRIC_MAX,
  formatWhoopRingValue,
} from "../../chat/whoopMetrics";

function formatAnimatedMetricValue(
  value: number | null,
  max: number,
  digits = 0,
): string {
  if (value == null || Number.isNaN(value)) return "";
  const clamped = Math.max(0, Math.min(max, value));
  if (digits > 0) return clamped.toFixed(digits);
  return String(Math.round(clamped));
}

function useAnimatedMetricValue(
  value: number | null | undefined,
  animationKey: string,
): { value: number | null; visible: boolean } {
  const [animatedValue, setAnimatedValue] = useState<number | null>(
    value != null && Number.isFinite(value) ? value : null,
  );
  const [visible, setVisible] = useState(value != null && Number.isFinite(value));

  useEffect(() => {
    if (value == null || !Number.isFinite(value)) {
      setAnimatedValue(null);
      setVisible(false);
      return;
    }

    setAnimatedValue(0);
    setVisible(false);

    let startTime: number | null = null;
    let frameId = 0;
    const durationMs = 460;
    const target = Math.max(0, value);

    const step = (timestamp: number) => {
      if (startTime == null) startTime = timestamp;
      const progress = Math.min(1, (timestamp - startTime) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      setAnimatedValue(target * eased);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(step);
        return;
      }

      setAnimatedValue(target);
    };

    frameId = window.requestAnimationFrame((timestamp) => {
      setVisible(true);
      step(timestamp);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [animationKey, value]);

  return { value: animatedValue, visible };
}

export function VaultDocumentWhoopHeader({ snapshot }: { snapshot: WhoopSnapshotEntity }) {
  const animationKey = snapshot.id || snapshot.date;
  const sleep = useAnimatedMetricValue(snapshot.sleepPerformance, `${animationKey}:sleep`);
  const recovery = useAnimatedMetricValue(snapshot.recoveryScore, `${animationKey}:recovery`);
  const strain = useAnimatedMetricValue(snapshot.strainScore, `${animationKey}:strain`);

  return (
    <div className="vault-document-whoop">
      <div className="whoop-metrics-row">
        <WhoopMetricRing
          label="Sleep"
          value={sleep.value}
          max={WHOOP_METRIC_MAX.sleep}
          ringColor={WHOOP_METRIC_COLORS.sleep}
          displayValue={formatAnimatedMetricValue(sleep.value, WHOOP_METRIC_MAX.sleep)}
          valueClassName={!sleep.visible ? "whoop-metric-ring-value--hidden" : undefined}
          title={
            snapshot.sleepPerformance != null
              ? `Sleep ${formatWhoopRingValue(snapshot.sleepPerformance, WHOOP_METRIC_MAX.sleep)}`
              : undefined
          }
        />
        <WhoopMetricRing
          label="Recovery"
          value={recovery.value}
          max={WHOOP_METRIC_MAX.recovery}
          ringColor={WHOOP_METRIC_COLORS.recovery}
          displayValue={formatAnimatedMetricValue(recovery.value, WHOOP_METRIC_MAX.recovery)}
          valueClassName={!recovery.visible ? "whoop-metric-ring-value--hidden" : undefined}
          title={
            snapshot.recoveryScore != null
              ? `Recovery ${formatWhoopRingValue(snapshot.recoveryScore, WHOOP_METRIC_MAX.recovery)}`
              : undefined
          }
        />
        <WhoopMetricRing
          label="Strain"
          value={strain.value}
          targetValue={snapshot.strainTarget?.value}
          max={WHOOP_METRIC_MAX.strain}
          ringColor={WHOOP_METRIC_COLORS.strain}
          displayValue={formatAnimatedMetricValue(strain.value, WHOOP_METRIC_MAX.strain, 1)}
          valueClassName={!strain.visible ? "whoop-metric-ring-value--hidden" : undefined}
          title={
            snapshot.strainScore != null
              ? `Strain ${formatWhoopRingValue(snapshot.strainScore, WHOOP_METRIC_MAX.strain, 1)}`
              : undefined
          }
        />
      </div>
    </div>
  );
}
