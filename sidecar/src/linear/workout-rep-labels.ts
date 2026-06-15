import {
  WORKOUT_REP_LABEL_GROUP,
  fetchLinearTeamLabelGroupLabels,
} from "./team-labels.ts";

export { WORKOUT_REP_LABEL_GROUP };

export async function assertWorkoutRepLabel(teamId: string, labelId: string): Promise<string> {
  const trimmed = labelId.trim();
  if (!trimmed) {
    throw new Error("Rep label is required");
  }

  const labels = await fetchLinearTeamLabelGroupLabels(teamId, WORKOUT_REP_LABEL_GROUP);
  const match = labels.find((label) => label.id === trimmed);
  if (!match) {
    throw new Error(
      `Unknown workout rep label. Add it to the "${WORKOUT_REP_LABEL_GROUP}" label group in Linear.`,
    );
  }

  return match.id;
}
