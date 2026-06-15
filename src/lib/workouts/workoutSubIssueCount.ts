import type { WorkoutSessionEntity } from "../api";

export function countWorkoutSessionSubIssues(
  session: WorkoutSessionEntity | null | undefined,
): number {
  if (!session) return 0;
  return session.groupSets.reduce((total, groupSet) => total + groupSet.reps.length, 0);
}
