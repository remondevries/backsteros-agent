import { useMemo, useState } from "react";
import { useWorkoutSets } from "../../hooks/useWorkoutSets";
import {
  filterWorkoutSetsByRange,
  previousDateRange,
  resolveDateRange,
  volumeChartGranularity,
} from "../../lib/workouts/filter";
import type { Period } from "../../lib/periodTypes";
import { todayIso } from "../../lib/dateFormat";
import { buildMuscleVolumeLineSeries } from "../../lib/workouts/chartSeries";
import { computeWorkoutsRollups, exerciseProgression } from "../../lib/workouts/rollups";
import { MUSCLE_GROUPS } from "../../lib/workouts/exerciseCatalog";
import { useContentPanelNavigation } from "../contentPanelNavigation";
import { WorkoutsKpiTiles } from "./WorkoutsKpiTiles";
import { WorkoutsChartCard, type WorkoutsChartPanelTab } from "./WorkoutsChartCard";
import { MuscleVolumeLineChart } from "./MuscleVolumeLineChart";
import { MuscleGroupRadarChart } from "./MuscleGroupRadarChart";
import { ExerciseProgression } from "./ExerciseProgression";
import { SessionsTable } from "./SessionsTable";
import { WorkoutSetEntryForm } from "./WorkoutSetEntryForm";
import { workoutsDayPath } from "../../lib/workouts/workoutDays";

const DEFAULT_PERIOD: Period = { kind: "ytd" };

export function WorkoutsDashboard() {
  const { sets, loading, error, parseError, refresh, appendSets } = useWorkoutSets();
  const { setActiveVaultDocument } = useContentPanelNavigation();
  const selectedYear = Number(todayIso().slice(0, 4));
  const [period] = useState<Period>(DEFAULT_PERIOD);
  const [chartTab, setChartTab] = useState<WorkoutsChartPanelTab>("volume");
  const [progressionExercise, setProgressionExercise] = useState("");
  const [muscleLineVisible, setMuscleLineVisible] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MUSCLE_GROUPS.map((mg) => [mg, true])),
  );

  const range = useMemo(
    () => resolveDateRange(period, selectedYear),
    [period, selectedYear],
  );
  const previousRange = useMemo(
    () => previousDateRange(period, range, selectedYear),
    [period, range, selectedYear],
  );
  const filtered = useMemo(() => filterWorkoutSetsByRange(sets, range), [sets, range]);
  const previousFiltered = useMemo(
    () => filterWorkoutSetsByRange(sets, previousRange),
    [sets, previousRange],
  );
  const rollups = useMemo(
    () =>
      computeWorkoutsRollups(filtered, {
        volumeGranularity: volumeChartGranularity(period, range),
      }),
    [filtered, period, range],
  );
  const previousRollups = useMemo(
    () => computeWorkoutsRollups(previousFiltered, { includeSessions: false }),
    [previousFiltered],
  );
  const volumeSeries = useMemo(
    () =>
      buildMuscleVolumeLineSeries(
        rollups.weekBuckets,
        [...MUSCLE_GROUPS],
        volumeChartGranularity(period, range),
        range,
        period,
      ),
    [rollups.weekBuckets, period, range],
  );
  const progressionPoints = useMemo(() => {
    if (!progressionExercise) return [];
    return exerciseProgression(filtered, progressionExercise);
  }, [filtered, progressionExercise]);

  const comparisonContext =
    period.kind === "ytd" ? "last year" : `previous ${period.kind.replace("-", " ")}`;

  const openDay = (date: string) => {
    setActiveVaultDocument({ path: workoutsDayPath(date), title: date });
  };

  if (loading) {
    return <p className="workout-dashboard-status">Loading workouts…</p>;
  }

  return (
    <div className="workout-dashboard">
      <header className="workout-dashboard-header">
        <h1 className="workout-dashboard-title">Workouts</h1>
        <button type="button" className="workout-dashboard-refresh" onClick={() => void refresh()}>
          Refresh
        </button>
      </header>

      {error ? <p className="workout-dashboard-error">{error}</p> : null}
      {parseError ? <p className="workout-dashboard-error">{parseError}</p> : null}

      <WorkoutsKpiTiles
        current={rollups.kpis}
        previous={previousRollups.kpis}
        comparisonContext={comparisonContext}
      />

      <WorkoutsChartCard
        activeTab={chartTab}
        onTabChange={setChartTab}
        muscleLineVisible={muscleLineVisible}
        onToggleMuscle={(mg) =>
          setMuscleLineVisible((prev) => ({ ...prev, [mg]: prev[mg] === false }))
        }
        progressionExercise={progressionExercise}
        exercises={rollups.exercises}
        onProgressionExerciseChange={setProgressionExercise}
      >
        {chartTab === "volume" ? (
          <MuscleVolumeLineChart
            series={volumeSeries}
            muscleGroups={[...MUSCLE_GROUPS]}
            muscleLineVisible={muscleLineVisible}
          />
        ) : null}
        {chartTab === "muscle" ? (
          <MuscleGroupRadarChart
            buckets={rollups.muscleGroupBuckets}
            muscleLineVisible={muscleLineVisible}
          />
        ) : null}
        {chartTab === "progression" ? (
          <ExerciseProgression points={progressionPoints} exercise={progressionExercise} />
        ) : null}
      </WorkoutsChartCard>

      <WorkoutSetEntryForm
        onSubmit={async (set) => {
          await appendSets([set]);
        }}
      />

      <section className="workout-sessions-section">
        <h2 className="workout-section-title">Sessions</h2>
        <SessionsTable sessions={rollups.sessions} onSelectDay={openDay} />
      </section>
    </div>
  );
}
