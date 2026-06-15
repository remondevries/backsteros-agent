import { useMemo, type CSSProperties } from "react";
import { useLinearWorkoutMilestones } from "../../hooks/useLinearWorkoutMilestones";
import { hasWorkoutMilestoneForDate } from "../../lib/workouts/workoutMilestoneGroups";
import {
  WHOOP_METRIC_RING_CIRCUMFERENCE,
  whoopValueToDash,
} from "../../chat/whoopMetrics";
import { SidebarWorkoutsIcon } from "../SidebarNavIcons";

const GYM_RING_STROKE_WIDTH = 3;
const GYM_RING_COLOR_VISITED = "#5EC269";
const GYM_RING_COLOR_MISSED = "#EB5757";
const GYM_RING_COLOR_LOADING = "color-mix(in srgb, var(--text-faint) 45%, transparent)";

function DailyGymRing({ fillPercent }: { fillPercent: number }) {
  const dashLength = whoopValueToDash(fillPercent, 100);

  return (
    <svg className="whoop-metric-ring-svg" viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth={GYM_RING_STROKE_WIDTH}
        className="whoop-metric-ring-track"
      />
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth={GYM_RING_STROKE_WIDTH}
        strokeDasharray={`${WHOOP_METRIC_RING_CIRCUMFERENCE} ${WHOOP_METRIC_RING_CIRCUMFERENCE}`}
        strokeDashoffset={WHOOP_METRIC_RING_CIRCUMFERENCE - dashLength}
        strokeLinecap="round"
        className="whoop-metric-ring-fill"
      />
    </svg>
  );
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

  const { milestones, loading } = useLinearWorkoutMilestones({
    teamId: normalizedTeamId,
    enabled: showIndicator,
  });

  const visitedGym = useMemo(
    () => hasWorkoutMilestoneForDate(milestones, normalizedDate),
    [milestones, normalizedDate],
  );

  const ringColor = loading
    ? GYM_RING_COLOR_LOADING
    : visitedGym
      ? GYM_RING_COLOR_VISITED
      : GYM_RING_COLOR_MISSED;

  const ringFillPercent = loading ? 0 : 100;

  if (!showIndicator) return null;

  const title = visitedGym
    ? "Gym session logged for this day"
    : loading
      ? "Checking gym session…"
      : "No gym session for this day";

  return (
    <div
      className={[
        "whoop-metric-ring-item",
        "daily-gym-indicator",
        loading
          ? "daily-gym-indicator--loading"
          : visitedGym
            ? "daily-gym-indicator--visited"
            : "daily-gym-indicator--missed",
      ]
        .filter(Boolean)
        .join(" ")}
      title={title}
      aria-label={title}
    >
      <div
        className="whoop-metric-ring-badge"
        style={{ "--whoop-metric-ring-color": ringColor } as CSSProperties}
      >
        <DailyGymRing fillPercent={ringFillPercent} />
        <SidebarWorkoutsIcon className="daily-gym-indicator__icon" />
      </div>
      <span className="whoop-metric-ring-label">Gym</span>
    </div>
  );
}
