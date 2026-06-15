import { createContext, useContext, type ReactNode } from "react";

type WorkoutsDashboardScrollContextValue = {
  graphCollapsed: boolean;
};

const WorkoutsDashboardScrollContext = createContext<WorkoutsDashboardScrollContextValue | null>(
  null,
);

export function WorkoutsDashboardScrollProvider({
  graphCollapsed,
  children,
}: {
  graphCollapsed: boolean;
  children: ReactNode;
}) {
  return (
    <WorkoutsDashboardScrollContext.Provider value={{ graphCollapsed }}>
      {children}
    </WorkoutsDashboardScrollContext.Provider>
  );
}

export function useWorkoutsDashboardGraphCollapsed(): boolean {
  return useContext(WorkoutsDashboardScrollContext)?.graphCollapsed ?? false;
}
