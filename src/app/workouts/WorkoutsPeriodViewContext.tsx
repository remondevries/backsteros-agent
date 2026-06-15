import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  defaultWorkoutPeriodViewId,
  type WorkoutPeriodViewId,
} from "../../lib/workouts/workoutPeriodViews";

type WorkoutsPeriodViewContextValue = {
  periodView: WorkoutPeriodViewId;
  setPeriodView: (view: WorkoutPeriodViewId) => void;
};

const WorkoutsPeriodViewContext = createContext<WorkoutsPeriodViewContextValue | null>(null);

export function WorkoutsPeriodViewProvider({ children }: { children: ReactNode }) {
  const [periodView, setPeriodView] = useState<WorkoutPeriodViewId>(defaultWorkoutPeriodViewId);
  const value = useMemo(
    () => ({
      periodView,
      setPeriodView,
    }),
    [periodView],
  );

  return (
    <WorkoutsPeriodViewContext.Provider value={value}>{children}</WorkoutsPeriodViewContext.Provider>
  );
}

export function useWorkoutsPeriodView(): WorkoutsPeriodViewContextValue {
  const context = useContext(WorkoutsPeriodViewContext);
  if (!context) {
    throw new Error("useWorkoutsPeriodView must be used within WorkoutsPeriodViewProvider");
  }
  return context;
}
