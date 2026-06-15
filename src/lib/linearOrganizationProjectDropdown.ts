import type { ReactNode } from "react";
import type { SearchableDropdownOption } from "../app/ui/SearchableDropdown";
import { searchableDropdownShortcut } from "../app/ui/searchableDropdownShortcuts";

export type LinearOrganizationProjectSummary = {
  id: string;
  name: string;
};

export function linearProjectsToDropdownOptions(
  projects: LinearOrganizationProjectSummary[],
  renderIcon: (project: LinearOrganizationProjectSummary) => ReactNode,
  startIndex = 0,
): SearchableDropdownOption[] {
  return projects.map((project, index) => ({
    value: project.id,
    label: project.name,
    icon: renderIcon(project),
    shortcut: searchableDropdownShortcut(startIndex + index),
  }));
}

/** When a team is selected, show only its projects; otherwise show all projects. */
export function resolveOrganizationFilteredProjectOptions(
  allProjectOptions: SearchableDropdownOption[],
  teamProjectOptions: SearchableDropdownOption[],
  selectedTeamId: string | null | undefined,
  teamProjectsLoadedForTeamId: string | null,
): SearchableDropdownOption[] {
  const teamId = selectedTeamId?.trim();
  if (!teamId || teamProjectsLoadedForTeamId !== teamId) {
    return allProjectOptions;
  }
  return teamProjectOptions;
}
