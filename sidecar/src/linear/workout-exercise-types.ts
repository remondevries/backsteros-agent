import {
  WORKOUT_SET_LABEL_GROUP,
  fetchLinearTeamLabelGroupLabels,
} from "./team-labels.ts";

export { WORKOUT_SET_LABEL_GROUP };

export async function assertWorkoutSetExercise(teamId: string, value: string): Promise<string> {
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

  return match.name;
}
