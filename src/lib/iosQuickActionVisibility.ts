import { useContentPanelNavigation } from "../app/contentPanelNavigation";
import { workoutDateKeyFromPath } from "./workouts/workoutDays";

/** True when main/sidebar focus is on a document, issue, or vault note rather than a list. */
export function isContentDetailViewOpen(
  navigation: Pick<
    ReturnType<typeof useContentPanelNavigation>,
    "activeLinearDocument" | "activeLinearIssue" | "activeVaultDocument"
  >,
): boolean {
  if (navigation.activeLinearDocument != null || navigation.activeLinearIssue != null) {
    return true;
  }

  const vaultPath = navigation.activeVaultDocument?.path;
  if (!vaultPath) {
    return false;
  }

  // Workout day sessions are list-style views (group sets + reps), not document detail.
  if (workoutDateKeyFromPath(vaultPath) != null) {
    return false;
  }

  return true;
}
