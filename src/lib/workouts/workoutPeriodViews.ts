export type WorkoutPeriodViewId = "yearly" | "quarter" | "monthly";

export type WorkoutPeriodViewDefinition = {
  id: WorkoutPeriodViewId;
  label: string;
};

export const workoutPeriodViews: readonly WorkoutPeriodViewDefinition[] = [
  { id: "yearly", label: "Yearly" },
  { id: "quarter", label: "Quarter" },
  { id: "monthly", label: "Monthly" },
] as const;

export function isWorkoutPeriodViewId(value: string): value is WorkoutPeriodViewId {
  return workoutPeriodViews.some((view) => view.id === value);
}

export const defaultWorkoutPeriodViewId: WorkoutPeriodViewId = "monthly";
