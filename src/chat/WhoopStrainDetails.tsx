import type { WhoopSnapshotEntity, WhoopWorkoutEntity } from "./types";
import { WhoopWorkoutRow } from "./WhoopWorkoutRow";
import {
  buildStrainZoneRows,
} from "./whoopStrain";

export function WhoopWorkoutList({
  workouts,
  showTitle = true,
}: {
  workouts: WhoopWorkoutEntity[];
  showTitle?: boolean;
}) {
  if (workouts.length === 0) return null;

  return (
    <div className="whoop-strain-workouts">
      {showTitle && <h5 className="whoop-strain-workouts-title">Workouts</h5>}
      <div className="morning-review-list whoop-workout-list">
        {workouts.map((workout) => (
          <WhoopWorkoutRow key={workout.id} workout={workout} />
        ))}
      </div>
    </div>
  );
}

function StrainStatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="whoop-sleep-stat-tile">
      <span className="whoop-sleep-stat-label">{label}</span>
      <span className="whoop-sleep-stat-value">{value}</span>
    </div>
  );
}

export function WhoopStrainDetails({
  item,
  hideSteps = false,
  hideWorkouts = false,
}: {
  item: WhoopSnapshotEntity;
  hideSteps?: boolean;
  hideWorkouts?: boolean;
}) {
  const zoneRows = buildStrainZoneRows(item.strainZoneDurations);

  const statTiles: Array<{ label: string; value: string }> = [];
  if (!hideSteps && item.steps != null && item.steps > 0) {
    statTiles.push({ label: "Steps", value: item.steps.toLocaleString() });
  }
  if (item.strengthActivityTime) {
    statTiles.push({ label: "Strength", value: item.strengthActivityTime });
  }
  for (const row of zoneRows) {
    if (row.value) statTiles.push({ label: row.label, value: row.value });
  }
  if (item.strainCalories != null && item.strainCalories > 0) {
    statTiles.push({ label: "Calories", value: `${item.strainCalories.toLocaleString()} cal` });
  }
  if (item.strainAvgHrBpm != null) {
    statTiles.push({ label: "Avg HR", value: `${Math.round(item.strainAvgHrBpm)} bpm` });
  }
  if (item.strainMaxHrBpm != null) {
    statTiles.push({ label: "Max HR", value: `${Math.round(item.strainMaxHrBpm)} bpm` });
  }

  const hasWorkouts = !hideWorkouts && Boolean(item.workouts && item.workouts.length > 0);
  const hasStats = statTiles.length > 0;

  if (!hasStats && !hasWorkouts) {
    return null;
  }

  return (
    <div className="whoop-strain-details">
      {hasStats && (
        <div className="whoop-sleep-stats-grid">
          {statTiles.map((tile) => (
            <StrainStatTile key={tile.label} label={tile.label} value={tile.value} />
          ))}
        </div>
      )}

      {hasWorkouts && item.workouts && <WhoopWorkoutList workouts={item.workouts} />}
    </div>
  );
}
