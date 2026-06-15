import type { LinearSidebarTeamConfig } from "../app/sidebarNavConfig";

/** Unique Linear team ids configured on the setup / workspace-teams settings screen. */
export function collectWorkspaceSetupLinearTeamIds(
  config: LinearSidebarTeamConfig,
): string[] {
  const ids = [
    config.inboxLinearTeamId,
    config.dailyLinearTeamId,
    config.workoutsLinearTeamId,
    config.lettersLinearTeamId,
    config.knowledgeBaseLinearTeamId,
    config.addressbookLinearTeamId,
  ]
    .map((id) => id?.trim())
    .filter((id): id is string => Boolean(id));

  return [...new Set(ids)];
}

export function workspaceSetupLinearTeamIdSet(
  config: LinearSidebarTeamConfig,
): ReadonlySet<string> {
  return new Set(collectWorkspaceSetupLinearTeamIds(config));
}

export function excludeWorkspaceSetupLinearTeams<T extends { id: string }>(
  teams: T[],
  excludedTeamIds: ReadonlySet<string>,
): T[] {
  if (excludedTeamIds.size === 0) return teams;
  return teams.filter((team) => !excludedTeamIds.has(team.id));
}

export function excludeWorkspaceSetupTeamDropdownOptions<
  T extends { value: string },
>(options: T[], excludedTeamIds: ReadonlySet<string>): T[] {
  if (excludedTeamIds.size === 0) return options;
  return options.filter((option) => !excludedTeamIds.has(option.value));
}

export function excludeWorkspaceSetupTeamProjects<T extends { id: string }>(
  projects: T[],
  excludedProjectIds: ReadonlySet<string>,
): T[] {
  if (excludedProjectIds.size === 0) return projects;
  return projects.filter((project) => !excludedProjectIds.has(project.id));
}
