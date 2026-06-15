import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { SearchableDropdownOption } from "../app/ui/SearchableDropdown";
import {
  fetchAllLinearProjects,
  fetchLinearTeamProjects,
  fetchLinearTeams,
} from "../lib/api";
import {
  linearProjectsToDropdownOptions,
  resolveOrganizationFilteredProjectOptions,
} from "../lib/linearOrganizationProjectDropdown";
import { excludeWorkspaceSetupTeamDropdownOptions } from "../lib/workspaceSetupTeamIds";
import { searchableDropdownShortcut } from "../app/ui/searchableDropdownShortcuts";

export function useLinearOrganizationProjectOptions({
  selectedTeamId,
  renderProjectIcon,
  renderTeamIcon,
  excludedTeamIds,
}: {
  selectedTeamId: string | null | undefined;
  renderProjectIcon: (name: string) => ReactNode;
  renderTeamIcon: () => ReactNode;
  excludedTeamIds?: ReadonlySet<string>;
}) {
  const [teams, setTeams] = useState<SearchableDropdownOption[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsLoaded, setTeamsLoaded] = useState(false);

  const [allProjectOptions, setAllProjectOptions] = useState<SearchableDropdownOption[]>([]);
  const [allProjectsLoading, setAllProjectsLoading] = useState(false);
  const [allProjectsLoaded, setAllProjectsLoaded] = useState(false);

  const [teamProjectOptions, setTeamProjectOptions] = useState<SearchableDropdownOption[]>([]);
  const [teamProjectsLoading, setTeamProjectsLoading] = useState(false);
  const [teamProjectsLoadedForTeamId, setTeamProjectsLoadedForTeamId] = useState<string | null>(
    null,
  );

  const loadTeams = useCallback(async () => {
    if (teamsLoaded || teamsLoading) return;

    setTeamsLoading(true);
    try {
      const result = await fetchLinearTeams();
      const options = result.teams.map((team, index) => ({
        value: team.id,
        label: team.name,
        icon: renderTeamIcon(),
        shortcut: searchableDropdownShortcut(index),
      }));
      setTeams(options);
      setTeamsLoaded(true);
    } catch {
      setTeams([]);
      setTeamsLoaded(true);
    } finally {
      setTeamsLoading(false);
    }
  }, [renderTeamIcon, teamsLoaded, teamsLoading]);

  const loadAllProjects = useCallback(async () => {
    if (allProjectsLoaded || allProjectsLoading) return;

    setAllProjectsLoading(true);
    try {
      const result = await fetchAllLinearProjects();
      setAllProjectOptions(
        linearProjectsToDropdownOptions(result.projects, (project) =>
          renderProjectIcon(project.name),
        ),
      );
      setAllProjectsLoaded(true);
    } catch {
      setAllProjectOptions([]);
      setAllProjectsLoaded(true);
    } finally {
      setAllProjectsLoading(false);
    }
  }, [allProjectsLoaded, allProjectsLoading, renderProjectIcon]);

  const loadTeamProjects = useCallback(
    async (teamId: string) => {
      const normalizedTeamId = teamId.trim();
      if (!normalizedTeamId) {
        setTeamProjectOptions([]);
        setTeamProjectsLoadedForTeamId(null);
        return;
      }

      if (teamProjectsLoading || teamProjectsLoadedForTeamId === normalizedTeamId) return;

      setTeamProjectsLoading(true);
      try {
        const result = await fetchLinearTeamProjects(normalizedTeamId);
        setTeamProjectOptions(
          linearProjectsToDropdownOptions(result.projects, (project) =>
            renderProjectIcon(project.name),
          ),
        );
        setTeamProjectsLoadedForTeamId(normalizedTeamId);
      } catch {
        setTeamProjectOptions([]);
        setTeamProjectsLoadedForTeamId(normalizedTeamId);
      } finally {
        setTeamProjectsLoading(false);
      }
    },
    [renderProjectIcon, teamProjectsLoadedForTeamId, teamProjectsLoading],
  );

  useEffect(() => {
    void loadTeams();
    void loadAllProjects();
  }, [loadAllProjects, loadTeams]);

  useEffect(() => {
    const teamId = selectedTeamId?.trim();
    if (!teamId) {
      setTeamProjectOptions([]);
      setTeamProjectsLoadedForTeamId(null);
      return;
    }
    void loadTeamProjects(teamId);
  }, [loadTeamProjects, selectedTeamId]);

  const projectOptions = resolveOrganizationFilteredProjectOptions(
    allProjectOptions,
    teamProjectOptions,
    selectedTeamId,
    teamProjectsLoadedForTeamId,
  );

  const visibleTeams = useMemo(
    () => excludeWorkspaceSetupTeamDropdownOptions(teams, excludedTeamIds ?? new Set()),
    [excludedTeamIds, teams],
  );

  const projectsLoading =
    allProjectsLoading || (Boolean(selectedTeamId?.trim()) && teamProjectsLoading);

  const ensureProjectsLoaded = useCallback(() => {
    void loadAllProjects();
    const teamId = selectedTeamId?.trim();
    if (teamId) {
      void loadTeamProjects(teamId);
    }
  }, [loadAllProjects, loadTeamProjects, selectedTeamId]);

  return {
    teams: visibleTeams,
    teamsLoading,
    projectOptions,
    projectsLoading,
    loadTeams,
    ensureProjectsLoaded,
    resetTeamProjects: () => {
      setTeamProjectOptions([]);
      setTeamProjectsLoadedForTeamId(null);
    },
  };
}
