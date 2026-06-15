import type { UserAccountWorkspace } from "./accounts.ts";

export function isUserAccountSetupComplete(
  workspace: UserAccountWorkspace,
  options?: { isAdministrator?: boolean },
): boolean {
  if (workspace.setupCompletedAt) {
    return true;
  }

  const isAdministrator = options?.isAdministrator ?? true;

  return Boolean(
    workspace.inboxLinearTeamId?.trim() &&
      workspace.dailyLinearTeamId?.trim() &&
      (isAdministrator ? workspace.workoutsLinearTeamId?.trim() : true) &&
      workspace.lettersLinearTeamId?.trim() &&
      workspace.knowledgeBaseLinearTeamId?.trim() &&
      workspace.addressbookLinearTeamId?.trim(),
  );
}
