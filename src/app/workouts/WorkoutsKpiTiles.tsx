import type { WorkoutKpis } from "../../lib/workouts/rollups";
import { round2 } from "../../lib/amountFormat";

interface TileProps {
  label: string;
  value: string;
  numericValue: number;
  previousNumeric: number | null;
  comparisonContext: string;
}

function formatVolume(kg: number): string {
  if (kg <= 0) return "0 kg";
  if (kg < 1000) return `${Math.round(kg)} kg`;
  return `${(kg / 1000).toFixed(kg < 10000 ? 2 : 1)}k kg`;
}

function Tile({ label, value, numericValue, previousNumeric, comparisonContext }: TileProps) {
  const hasPrevious = previousNumeric != null && Number.isFinite(previousNumeric);
  const isFromZeroBaseline = hasPrevious && previousNumeric === 0 && numericValue !== 0;
  const delta =
    hasPrevious && previousNumeric !== 0
      ? round2(((numericValue - previousNumeric) / Math.abs(previousNumeric)) * 100)
      : null;
  const showDelta = delta != null || isFromZeroBaseline;
  const positiveChange = isFromZeroBaseline ? numericValue > 0 : (delta ?? 0) >= 0;
  const deltaText = isFromZeroBaseline
    ? `New vs. ${comparisonContext}`
    : `${positiveChange ? "+" : ""}${delta?.toFixed(1)}% vs. ${comparisonContext}`;

  return (
    <div className="workout-kpi-tile">
      <div className="workout-kpi-label">{label}</div>
      <div className="workout-kpi-value">{value}</div>
      {showDelta ? (
        <div className={`workout-kpi-delta ${positiveChange ? "is-good" : "is-bad"}`}>
          {deltaText}
        </div>
      ) : (
        <div className="workout-kpi-delta is-muted">—</div>
      )}
    </div>
  );
}

export function WorkoutsKpiTiles({
  current,
  previous,
  comparisonContext,
}: {
  current: WorkoutKpis;
  previous: WorkoutKpis | null;
  comparisonContext: string;
}) {
  return (
    <div className="workout-kpis">
      <Tile
        label="Workouts"
        value={String(current.workouts)}
        numericValue={current.workouts}
        previousNumeric={previous?.workouts ?? null}
        comparisonContext={comparisonContext}
      />
      <Tile
        label="Total volume"
        value={formatVolume(current.totalVolume)}
        numericValue={current.totalVolume}
        previousNumeric={previous?.totalVolume ?? null}
        comparisonContext={comparisonContext}
      />
      <Tile
        label="Avg / workout"
        value={formatVolume(current.avgVolumePerWorkout)}
        numericValue={current.avgVolumePerWorkout}
        previousNumeric={previous?.avgVolumePerWorkout ?? null}
        comparisonContext={comparisonContext}
      />
      <Tile
        label="Total sets"
        value={String(current.totalSets)}
        numericValue={current.totalSets}
        previousNumeric={previous?.totalSets ?? null}
        comparisonContext={comparisonContext}
      />
    </div>
  );
}
