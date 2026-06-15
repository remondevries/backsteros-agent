import { WORKOUT_REP_LABEL_GROUP } from "../lib/workouts/linearWorkoutTypes";
import { useLinearWorkoutTeamLabels } from "./useLinearWorkoutTeamLabels";

export function useLinearWorkoutRepLabels(teamId: string | null | undefined, enabled = true) {
  return useLinearWorkoutTeamLabels(teamId, WORKOUT_REP_LABEL_GROUP, enabled);
}
