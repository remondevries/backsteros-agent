import { WORKOUT_SET_LABEL_GROUP } from "../lib/workouts/linearWorkoutTypes";
import { useLinearWorkoutTeamLabels } from "./useLinearWorkoutTeamLabels";

export function useLinearWorkoutSetLabels(teamId: string | null | undefined, enabled = true) {
  return useLinearWorkoutTeamLabels(teamId, WORKOUT_SET_LABEL_GROUP, enabled);
}
