import {
  WORKOUT_SET_LABEL_GROUP,
  fetchLinearTeamLabelGroupLabels,
} from "./team-labels.ts";

export { WORKOUT_SET_LABEL_GROUP };

export type WorkoutSetExerciseLabel = {
  id: string;
  name: string;
};

export async function resolveWorkoutSetExerciseLabel(
  teamId: string,
  value: string,
): Promise<WorkoutSetExerciseLabel> {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Exercise is required");
  }

  const labels = await fetchLinearTeamLabelGroupLabels(teamId, WORKOUT_SET_LABEL_GROUP);
  const match = labels.find(
    (label) => label.name.localeCompare(trimmed, undefined, { sensitivity: "base" }) === 0,
  );
  if (!match) {
    throw new Error(
      `Unknown workout exercise: ${trimmed}. Add it to the "${WORKOUT_SET_LABEL_GROUP}" label group in Linear.`,
    );
  }

  return { id: match.id, name: match.name };
}

export async function assertWorkoutSetExercise(teamId: string, value: string): Promise<string> {
  const resolved = await resolveWorkoutSetExerciseLabel(teamId, value);
  return resolved.name;
}
