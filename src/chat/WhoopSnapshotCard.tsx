import { WhoopIcon } from "./WhoopIcon";
import { WhoopMetricRing } from "./WhoopMetricRing";
import { EntitySourceBrand } from "./EntitySourceBrand";
import type { WhoopSnapshotEntity } from "./types";
import {
  WHOOP_METRIC_COLORS,
  WHOOP_METRIC_MAX,
  WHOOP_PRODUCTIVITY_COLOR,
  WHOOP_PRODUCTIVITY_MAX,
  WHOOP_PRODUCTIVITY_TARGET,
  WHOOP_STEPS_COLOR,
  WHOOP_STEPS_TARGET,
  formatWhoopRingValue,
} from "./whoopMetrics";
import { WhoopSleepDetails } from "./WhoopSleepDetails";
import { WhoopStrainDetails, WhoopWorkoutList } from "./WhoopStrainDetails";
import { hasWhoopSleepDetails } from "./whoopSleep";
import { countWhoopWorkouts, formatStrainInsight } from "./whoopStrain";

export function formatWhoopSnapshotDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDateLabel(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  const today = new Date();
  const sameDay =
    parsed.getFullYear() === today.getFullYear() &&
    parsed.getMonth() === today.getMonth() &&
    parsed.getDate() === today.getDate();

  if (sameDay) return "Today";

  return formatWhoopSnapshotDate(date);
}

export function WhoopSnapshotBrand() {
  return <EntitySourceBrand icon={<WhoopIcon size={14} />} label="Whoop" />;
}

export function WhoopSnapshotCard({
  item,
  showDate = true,
  showSleepDetails = true,
  strainOnly = false,
  hideWorkouts = false,
  showStrainInsight = false,
  productivityScore = null,
}: {
  item: WhoopSnapshotEntity;
  showDate?: boolean;
  showSleepDetails?: boolean;
  strainOnly?: boolean;
  hideWorkouts?: boolean;
  showStrainInsight?: boolean;
  productivityScore?: number | null;
}) {
  const sleepTitle =
    item.sleepDuration != null
      ? `Sleep performance ${formatWhoopRingValue(item.sleepPerformance, WHOOP_METRIC_MAX.sleep)}% · ${item.sleepDuration}`
      : item.sleepPerformance != null
        ? `Sleep performance ${Math.round(item.sleepPerformance)}%`
        : undefined;

  const recoveryTitle =
    item.recoveryState != null
      ? `Recovery ${formatWhoopRingValue(item.recoveryScore, WHOOP_METRIC_MAX.recovery)} · ${item.recoveryState}`
      : item.hrvMs != null
        ? `Recovery ${formatWhoopRingValue(item.recoveryScore, WHOOP_METRIC_MAX.recovery)} · HRV ${Math.round(item.hrvMs)} ms`
        : undefined;

  const strainTitle =
    item.workoutsCount != null && countWhoopWorkouts(item) > 0
      ? `Strain ${formatWhoopRingValue(item.strainScore, WHOOP_METRIC_MAX.strain, 1)} · ${countWhoopWorkouts(item)} workout${countWhoopWorkouts(item) === 1 ? "" : "s"}`
      : undefined;

  const dateLabel = formatDateLabel(item.date);
  const workoutCount = countWhoopWorkouts(item);

  if (strainOnly) {
    const stepCount = item.steps ?? 0;
    const showStepsRing = item.steps != null;
    const showProductivityRing = productivityScore != null;
    const productivityValue = productivityScore ?? 0;
    const workouts = item.workouts ?? [];
    const showWorkouts = !hideWorkouts && workouts.length > 0;
    const stepsTitle = showStepsRing
      ? `${stepCount.toLocaleString()} / ${WHOOP_STEPS_TARGET.toLocaleString()} steps`
      : undefined;
    const productivityTitle = showProductivityRing
      ? `${Math.round(productivityValue)} / ${WHOOP_PRODUCTIVITY_TARGET} productivity`
      : undefined;

    return (
      <div className="whoop-snapshot whoop-snapshot-strain-only">
        {showDate && (
          <div className="whoop-strain-intro">
            <span className="whoop-snapshot-date whoop-snapshot-date-only">{dateLabel}</span>
            {showStrainInsight && (
              <p className="whoop-strain-insight">{formatStrainInsight(item)}</p>
            )}
          </div>
        )}
        <div className="whoop-strain-summary">
          <div className="whoop-strain-rings">
            <WhoopMetricRing
              label="Strain"
              value={item.strainScore}
              targetValue={item.strainTarget?.value}
              max={WHOOP_METRIC_MAX.strain}
              ringColor={WHOOP_METRIC_COLORS.strain}
              displayValue={formatWhoopRingValue(item.strainScore, WHOOP_METRIC_MAX.strain, 1)}
              title={strainTitle}
            />
            <WhoopMetricRing
              label="Recovery"
              value={item.recoveryScore}
              max={WHOOP_METRIC_MAX.recovery}
              ringColor={WHOOP_METRIC_COLORS.recovery}
              displayValue={formatWhoopRingValue(item.recoveryScore, WHOOP_METRIC_MAX.recovery)}
              title={recoveryTitle}
            />
            {showStepsRing && (
              <WhoopMetricRing
                className="whoop-metric-ring-item-steps"
                label="Steps"
                value={stepCount}
                targetValue={WHOOP_STEPS_TARGET}
                max={WHOOP_STEPS_TARGET}
                ringColor={WHOOP_STEPS_COLOR}
                displayValue={stepCount.toLocaleString()}
                title={stepsTitle}
              />
            )}
            {showProductivityRing && (
              <WhoopMetricRing
                className="whoop-metric-ring-item-productivity"
                label="Productivity"
                value={productivityValue}
                targetValue={WHOOP_PRODUCTIVITY_TARGET}
                max={WHOOP_PRODUCTIVITY_MAX}
                ringColor={WHOOP_PRODUCTIVITY_COLOR}
                displayValue={formatWhoopRingValue(productivityValue, WHOOP_PRODUCTIVITY_MAX)}
                title={productivityTitle}
              />
            )}
          </div>
          {showWorkouts && <WhoopWorkoutList workouts={workouts} showTitle={false} />}
        </div>
        {workoutCount > 0 && !showWorkouts && !hideWorkouts && (
          <p className="whoop-strain-workouts">
            {workoutCount} workout{workoutCount === 1 ? "" : "s"} today
          </p>
        )}
        <WhoopStrainDetails
          item={item}
          hideSteps={showStepsRing}
          hideWorkouts={hideWorkouts || showWorkouts}
        />
      </div>
    );
  }

  return (
    <div className="whoop-snapshot">
      {showDate && (
        <span className="whoop-snapshot-date whoop-snapshot-date-only">{dateLabel}</span>
      )}
      <div className="whoop-metrics-row">
        <WhoopMetricRing
          label="Sleep"
          value={item.sleepPerformance}
          max={WHOOP_METRIC_MAX.sleep}
          ringColor={WHOOP_METRIC_COLORS.sleep}
          displayValue={formatWhoopRingValue(item.sleepPerformance, WHOOP_METRIC_MAX.sleep)}
          title={sleepTitle}
        />
        <WhoopMetricRing
          label="Recovery"
          value={item.recoveryScore}
          max={WHOOP_METRIC_MAX.recovery}
          ringColor={WHOOP_METRIC_COLORS.recovery}
          displayValue={formatWhoopRingValue(item.recoveryScore, WHOOP_METRIC_MAX.recovery)}
          title={recoveryTitle}
        />
        <WhoopMetricRing
          label="Strain"
          value={item.strainScore}
          targetValue={item.strainTarget?.value}
          max={WHOOP_METRIC_MAX.strain}
          ringColor={WHOOP_METRIC_COLORS.strain}
          displayValue={formatWhoopRingValue(item.strainScore, WHOOP_METRIC_MAX.strain, 1)}
          title={strainTitle}
        />
      </div>
      {showSleepDetails && hasWhoopSleepDetails(item) && <WhoopSleepDetails item={item} />}
    </div>
  );
}
