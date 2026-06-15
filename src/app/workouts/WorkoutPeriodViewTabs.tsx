import { workoutPeriodViews, type WorkoutPeriodViewId } from "../../lib/workouts/workoutPeriodViews";

export function WorkoutPeriodViewTabs({
  activeView,
  onChange,
}: {
  activeView: WorkoutPeriodViewId;
  onChange: (view: WorkoutPeriodViewId) => void;
}) {
  return (
    <div className="linear-project-view-tabs">
      <div className="linear-project-view-tabs-list" role="tablist" aria-label="Workout period views">
        {workoutPeriodViews.map((view) => {
          const active = activeView === view.id;
          return (
            <button
              key={view.id}
              type="button"
              role="tab"
              className={`linear-project-view-tab ${active ? "linear-project-view-tab-active" : ""}`}
              aria-selected={active}
              onClick={() => onChange(view.id)}
            >
              {view.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
