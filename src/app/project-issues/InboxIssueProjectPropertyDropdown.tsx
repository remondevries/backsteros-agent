import { useCallback, useEffect, useMemo, useRef } from "react";
import { LinearProjectIcon } from "../../chat/LinearProjectIcon";
import { fetchLinearProjectContext } from "../../lib/api";
import { useLinearOrganizationProjectOptions } from "../../hooks/useLinearOrganizationProjectOptions";
import { isInboxDraftIssueId } from "../../lib/inboxDraftIssue";
import { workspaceSetupLinearTeamIdSet } from "../../lib/workspaceSetupTeamIds";
import type { LinearSidebarTeamConfig } from "../sidebarNavConfig";
import { LinearTeamIcon } from "../SidebarNavIcons";
import { LinearIssueDetailsPropertyDropdown } from "./LinearIssueDetailsPropertyDropdown";

export type InboxIssueProjectSelection = {
  teamId: string;
  projectId: string;
};

export function InboxIssueProjectPropertyDropdown({
  issueId,
  teamId,
  projectId,
  onSelectionChange,
  disabled = false,
  registerOpenOrganization,
  registerOpenProject,
  workspaceTeamConfig = {},
}: {
  issueId: string;
  teamId: string;
  projectId: string;
  onSelectionChange: (selection: InboxIssueProjectSelection) => void;
  disabled?: boolean;
  registerOpenOrganization?: (open: (() => void) | null) => void;
  registerOpenProject?: (open: (() => void) | null) => void;
  workspaceTeamConfig?: LinearSidebarTeamConfig;
}) {
  const openTeamRef = useRef<(() => void) | null>(null);
  const openProjectRef = useRef<(() => void) | null>(null);

  const excludedTeamIds = useMemo(
    () => workspaceSetupLinearTeamIdSet(workspaceTeamConfig),
    [workspaceTeamConfig],
  );

  const renderProjectIcon = useCallback(
    (name: string) => <LinearProjectIcon title={name} />,
    [],
  );
  const renderTeamIcon = useCallback(() => <LinearTeamIcon />, []);

  const {
    teams,
    teamsLoading,
    projectOptions,
    projectsLoading,
    loadTeams,
    ensureProjectsLoaded,
    resetTeamProjects,
  } = useLinearOrganizationProjectOptions({
    selectedTeamId: teamId || null,
    renderProjectIcon,
    renderTeamIcon,
    excludedTeamIds,
  });

  const selectedTeamName = useMemo(() => {
    if (!teamId) return null;
    return teams.find((option) => option.value === teamId)?.label ?? null;
  }, [teamId, teams]);

  const selectedProjectName = useMemo(() => {
    if (!projectId) return null;
    return projectOptions.find((option) => option.value === projectId)?.label ?? null;
  }, [projectId, projectOptions]);

  const handleTeamChange = useCallback(
    (value: string) => {
      const nextTeamId = value.trim();
      if (!nextTeamId || nextTeamId === teamId || disabled) return;

      resetTeamProjects();
      onSelectionChange({ teamId: nextTeamId, projectId: "" });
    },
    [disabled, onSelectionChange, resetTeamProjects, teamId],
  );

  const handleProjectChange = useCallback(
    async (value: string) => {
      const selectedProjectId = value.trim();
      if (!selectedProjectId || disabled) return;

      if (teamId.trim()) {
        onSelectionChange({ teamId, projectId: selectedProjectId });
        return;
      }

      try {
        const contextResult = await fetchLinearProjectContext(selectedProjectId);
        const resolvedTeamId = contextResult.context?.teamId?.trim() ?? "";
        onSelectionChange({
          teamId: resolvedTeamId,
          projectId: selectedProjectId,
        });
      } catch {
        onSelectionChange({ teamId: "", projectId: selectedProjectId });
      }
    },
    [disabled, onSelectionChange, teamId],
  );

  const draftIssue = isInboxDraftIssueId(issueId);
  const teamDropdownDisabled = disabled || teamsLoading || draftIssue;
  const projectDropdownDisabled = disabled || projectsLoading || draftIssue || teamsLoading;

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    const openOrganization = () => {
      if (teamDropdownDisabled) return;
      openTeamRef.current?.();
    };
    registerOpenOrganization?.(openOrganization);
    return () => registerOpenOrganization?.(null);
  }, [registerOpenOrganization, teamDropdownDisabled]);

  useEffect(() => {
    const openProject = () => {
      if (projectDropdownDisabled) return;
      openProjectRef.current?.();
    };
    registerOpenProject?.(openProject);
    return () => registerOpenProject?.(null);
  }, [projectDropdownDisabled, registerOpenProject]);

  return (
    <>
      <LinearIssueDetailsPropertyDropdown
        value={teamId || null}
        options={teams}
        onChange={handleTeamChange}
        searchPlaceholder="Select organization…"
        searchShortcutLabel="O"
        ariaLabel="Select organization"
        registerOpenMenu={(open) => {
          openTeamRef.current = () => {
            void loadTeams();
            open();
          };
        }}
        fallbackIcon={<LinearTeamIcon />}
        fallbackLabel={
          draftIssue
            ? "Creating issue…"
            : teamsLoading
              ? "Loading organizations…"
              : selectedTeamName ?? "Select organization"
        }
        disabled={teamDropdownDisabled}
      />
      <LinearIssueDetailsPropertyDropdown
        value={projectId || null}
        options={projectOptions}
        onChange={(value) => void handleProjectChange(value)}
        searchPlaceholder="Select project…"
        searchShortcutLabel="⇧P"
        ariaLabel="Move to project"
        registerOpenMenu={(open) => {
          openProjectRef.current = () => {
            ensureProjectsLoaded();
            open();
          };
        }}
        fallbackIcon={<LinearProjectIcon title={selectedProjectName ?? undefined} />}
        fallbackLabel={
          draftIssue
            ? "Creating issue…"
            : projectsLoading
              ? "Loading projects…"
              : selectedProjectName ?? "Select project…"
        }
        disabled={projectDropdownDisabled}
      />
    </>
  );
}

export type InboxProjectMoveConfig = {
  issueId: string;
  getTitle: () => string;
  getDescription: () => string;
  onMoved: () => void;
  onViewConvertedIssue: (issue: {
    id: string;
    identifier: string;
    url: string;
    projectId: string;
    projectName: string;
  }) => void;
};
