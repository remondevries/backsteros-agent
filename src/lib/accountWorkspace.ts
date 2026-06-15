import type { AccountWorkspace } from "../chat/types";

export function isAccountSetupComplete(workspace: AccountWorkspace): boolean {
  if (workspace.setupCompletedAt) {
    return true;
  }

  return Boolean(
      workspace.inboxLinearTeamId?.trim() &&
      workspace.dailyLinearTeamId?.trim() &&
      workspace.workoutsLinearTeamId?.trim() &&
      workspace.lettersLinearTeamId?.trim() &&
      workspace.knowledgeBaseLinearTeamId?.trim() &&
      workspace.addressbookLinearTeamId?.trim(),
  );
}
