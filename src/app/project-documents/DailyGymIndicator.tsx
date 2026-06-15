import { useEffect, useState } from "react";
import { WhoopMetricRing } from "../../chat/WhoopMetricRing";
import { formatWhoopRingValue } from "../../chat/whoopMetrics";
import {
  DAILY_GYM_RING_COLOR,
  DAILY_GYM_RING_COLOR_LOADING,
  DAILY_GYM_RING_MAX,
  DAILY_GYM_SUB_ISSUE_TARGET,
  formatDailyGymRingTitle,
} from "../../lib/dailyGymMetrics";
import { useDailyGymSubIssueCount } from "../../hooks/useDailyGymSubIssueCount";

const WHOOP_HEADER_ANIMATION_MS = 460;

function useAnimatedGymCount(value: number, animationKey: string, enabled: boolean) {
  const [animatedValue, setAnimatedValue] = useState(enabled ? 0 : value);
  const [visible, setVisible] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setAnimatedValue(value);
      setVisible(true);
      return;
    }

    setAnimatedValue(0);
    setVisible(false);

    let startTime: number | null = null;
    let frameId = 0;
    const target = Math.max(0, value);

    const step = (timestamp: number) => {
      if (startTime == null) startTime = timestamp;
      const progress = Math.min(1, (timestamp - startTime) / WHOOP_HEADER_ANIMATION_MS);
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
  }, [animationKey, enabled, value]);

  return { value: animatedValue, visible };
}

export function DailyGymIndicator({
  date,
  teamId,
  enabled,
}: {
  date: string | null;
  teamId: string | null;
  enabled: boolean;
}) {
  const normalizedTeamId = teamId?.trim() ?? "";
  const normalizedDate = date?.trim() ?? "";
  const showIndicator = enabled && Boolean(normalizedDate) && Boolean(normalizedTeamId);

  const { count, loading } = useDailyGymSubIssueCount({
    teamId: normalizedTeamId,
    date: normalizedDate,
    enabled: showIndicator,
  });

  const animatedCount = useAnimatedGymCount(
    count,
    `${normalizedDate}:${count}`,
    showIndicator && !loading,
  );

  if (!showIndicator) return null;

  const ringColor = loading ? DAILY_GYM_RING_COLOR_LOADING : DAILY_GYM_RING_COLOR;
  const title = loading ? "Loading gym progress…" : formatDailyGymRingTitle(count);

  return (
    <WhoopMetricRing
      className="daily-gym-indicator"
      label="Gym"
      value={loading ? 0 : animatedCount.value}
      targetValue={DAILY_GYM_SUB_ISSUE_TARGET}
      max={DAILY_GYM_RING_MAX}
      ringColor={ringColor}
      animateFill={false}
      displayValue={formatWhoopRingValue(loading ? null : animatedCount.value, DAILY_GYM_RING_MAX)}
      valueClassName={
        loading || !animatedCount.visible ? "whoop-metric-ring-value--hidden" : undefined
      }
      title={title}
    />
  );
}
