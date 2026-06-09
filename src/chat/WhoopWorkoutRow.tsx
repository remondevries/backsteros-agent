import type { WhoopWorkoutEntity } from "./types";
import { WhoopWorkoutIcon } from "./WhoopWorkoutIcon";
import { formatWhoopClockTime, formatWhoopSportName } from "./whoopStrain";

function formatWorkoutStrain(strain: number | null | undefined): string | undefined {
  if (strain == null || Number.isNaN(strain)) return undefined;
  return strain.toFixed(1);
}

export function WhoopWorkoutRow({ workout }: { workout: WhoopWorkoutEntity }) {
  const sportLabel = formatWhoopSportName(workout.sportName, workout.sportId);
  const strainLabel = formatWorkoutStrain(workout.strain);
  const startLabel = formatWhoopClockTime(workout.start);

  const row = (
    <>
      <span className="linear-issue-status">
        <WhoopWorkoutIcon title={sportLabel} />
      </span>
      {strainLabel ? (
        <span className="whoop-workout-strain-label">{strainLabel}</span>
      ) : (
        <span className="linear-issue-id">{startLabel ?? "Workout"}</span>
      )}
      <span className="linear-issue-title">{sportLabel}</span>
      {workout.duration && (
        <span className="linear-issue-assignee whoop-workout-row-duration">{workout.duration}</span>
      )}
    </>
  );

  return (
    <div className="linear-issue-row-wrap">
      <div className="entity-row linear-issue-row">{row}</div>

      <div className="linear-issue-popover" role="tooltip">
        <header className="linear-issue-popover-header">
          <span className="linear-issue-popover-id">{startLabel ?? "Workout"}</span>
          {workout.duration && (
            <span className="linear-issue-popover-assignee">
              <span>{workout.duration}</span>
            </span>
          )}
        </header>

        <p className="linear-issue-popover-title">{sportLabel}</p>

        <div className="linear-issue-popover-divider" />

        <footer className="linear-issue-popover-meta">
          {strainLabel && (
            <span className="linear-issue-popover-meta-item">
              <WhoopWorkoutIcon size={14} />
              <span>{strainLabel} strain</span>
            </span>
          )}
          {workout.calories != null && (
            <span className="linear-issue-popover-meta-item">
              <span>{workout.calories} cal</span>
            </span>
          )}
          {workout.avgHrBpm != null && (
            <span className="linear-issue-popover-meta-item">
              <span>{Math.round(workout.avgHrBpm)} avg HR</span>
            </span>
          )}
          {workout.maxHrBpm != null && (
            <span className="linear-issue-popover-meta-item">
              <span>{Math.round(workout.maxHrBpm)} max HR</span>
            </span>
          )}
        </footer>
      </div>
    </div>
  );
}
