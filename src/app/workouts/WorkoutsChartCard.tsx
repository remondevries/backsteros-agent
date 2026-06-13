import type { ReactNode } from "react";
import { muscleGroupColor, MUSCLE_GROUPS } from "../../lib/workouts/exerciseCatalog";

export type WorkoutsChartPanelTab = "volume" | "muscle" | "progression";

const TABS: { id: WorkoutsChartPanelTab; label: string }[] = [
  { id: "volume", label: "Volume" },
  { id: "muscle", label: "Muscle groups" },
  { id: "progression", label: "Progression" },
];

export function WorkoutsChartCard({
  activeTab,
  onTabChange,
  children,
  muscleLineVisible,
  onToggleMuscle,
  progressionExercise,
  exercises,
  onProgressionExerciseChange,
}: {
  activeTab: WorkoutsChartPanelTab;
  onTabChange: (tab: WorkoutsChartPanelTab) => void;
  children: ReactNode;
  muscleLineVisible: Record<string, boolean>;
  onToggleMuscle: (muscleGroup: string) => void;
  progressionExercise: string;
  exercises: string[];
  onProgressionExerciseChange: (exercise: string) => void;
}) {
  const legendGroups = [...MUSCLE_GROUPS];

  return (
    <section className="workout-chart-card">
      <div className="workout-chart-card-header">
        <div className="workout-chart-tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`workout-chart-tab ${activeTab === tab.id ? "is-active" : ""}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === "progression" ? (
          <select
            className="workout-progression-select"
            value={progressionExercise}
            onChange={(event) => onProgressionExerciseChange(event.target.value)}
          >
            <option value="">Select exercise</option>
            {exercises.map((exercise) => (
              <option key={exercise} value={exercise}>
                {exercise}
              </option>
            ))}
          </select>
        ) : (
          <div className="workout-chart-legend">
            {legendGroups.map((mg) => (
              <button
                key={mg}
                type="button"
                className={`workout-chart-legend-item ${muscleLineVisible[mg] === false ? "is-off" : ""}`}
                style={{ "--workout-legend-color": muscleGroupColor(mg) } as React.CSSProperties}
                onClick={() => onToggleMuscle(mg)}
              >
                {mg}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="workout-chart-card-body">{children}</div>
    </section>
  );
}
