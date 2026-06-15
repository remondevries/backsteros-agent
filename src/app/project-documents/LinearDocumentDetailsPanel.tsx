import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { LinearProjectIcon } from "../../chat/LinearProjectIcon";
import { fetchLinearProjectContext, type LinearDocumentContent } from "../../lib/api";
import { useLinearOrganizationProjectOptions } from "../../hooks/useLinearOrganizationProjectOptions";
import { registerLinearIssuePropertyShortcuts } from "../../lib/linearIssuePropertyShortcuts";
import { pushNotification } from "../../lib/notifications";
import {
  LINEAR_NO_PROJECT_VALUE,
  linearDocumentOrganizationDropdownValue,
  linearDocumentProjectDropdownValue,
  linearDocumentProjectIdFromDropdownValue,
} from "../../lib/linearDocumentDetailDropdowns";
import {
  buildMeetingDocumentTitle,
  parseMeetingDocumentTitle,
} from "../../lib/meetingDocumentTitle";
import { searchableDropdownShortcut } from "../ui/searchableDropdownShortcuts";
import type { SearchableDropdownOption } from "../ui/SearchableDropdown";
import { LinearTeamIcon } from "../SidebarNavIcons";
import type { LinearSidebarTeamConfig } from "../sidebarNavConfig";
import { workspaceSetupLinearTeamIdSet } from "../../lib/workspaceSetupTeamIds";
import { MeetingDocumentDateTimePropertyDropdown } from "./MeetingDocumentDateTimePropertyDropdown";
import {
  LinearIssueDetailsPropertyDropdown,
} from "../project-issues/LinearIssueDetailsPropertyDropdown";

function LinearDocumentDetailsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="linear-issue-details-section">
      <header className="linear-issue-details-section-header">
        <span className="linear-issue-details-section-heading">
          <span className="linear-issue-details-section-chevron" aria-hidden="true">
            ▾
          </span>
          <h3 className="linear-issue-details-section-title">{title}</h3>
        </span>
      </header>
      <div className="linear-issue-details-section-body">{children}</div>
    </section>
  );
}

export function LinearDocumentDetailsPanel({
  document,
  meetingsSection = false,
  inboxSection = false,
  inboxTeamId = null,
  workspaceTeamConfig = {},
  onUpdateProperties,
  updatingProperties = false,
  propertiesError = null,
}: {
  document: LinearDocumentContent;
  meetingsSection?: boolean;
  inboxSection?: boolean;
  inboxTeamId?: string | null;
  workspaceTeamConfig?: LinearSidebarTeamConfig;
  onUpdateProperties: (updates: {
    teamId?: string;
    projectId?: string | null;
    title?: string;
  }) => Promise<{ error: string | null }>;
  updatingProperties?: boolean;
  propertiesError?: string | null;
}) {
  const openTeamRef = useRef<(() => void) | null>(null);
  const openProjectRef = useRef<(() => void) | null>(null);

  const selectedTeamId = document.teamId?.trim() || null;
  const selectedProjectId = document.projectId?.trim() || null;
  const savedOrganizationDropdownTeamId = linearDocumentOrganizationDropdownValue(selectedTeamId, {
    inboxSection,
    inboxTeamId,
  });
  const meetingTitleParts = useMemo(
    () => parseMeetingDocumentTitle(document.title),
    [document.title],
  );

  const [pendingOrganizationTeamId, setPendingOrganizationTeamId] = useState<string | null>(
    savedOrganizationDropdownTeamId,
  );
  const [pendingProjectDropdownValue, setPendingProjectDropdownValue] = useState(
    linearDocumentProjectDropdownValue(selectedProjectId),
  );
  const [localPropertiesError, setLocalPropertiesError] = useState<string | null>(null);

  useEffect(() => {
    setPendingOrganizationTeamId(savedOrganizationDropdownTeamId);
    setPendingProjectDropdownValue(linearDocumentProjectDropdownValue(selectedProjectId));
    setLocalPropertiesError(null);
  }, [document.id, savedOrganizationDropdownTeamId, selectedProjectId]);

  const pendingProjectId = linearDocumentProjectIdFromDropdownValue(pendingProjectDropdownValue);

  const renderProjectIcon = useCallback(
    (name: string) => <LinearProjectIcon title={name} />,
    [],
  );
  const renderTeamIcon = useCallback(() => <LinearTeamIcon />, []);

  const excludedTeamIds = useMemo(
    () => workspaceSetupLinearTeamIdSet(workspaceTeamConfig),
    [workspaceTeamConfig],
  );

  const {
    teams,
    teamsLoading,
    projectOptions: filteredProjectOptions,
    projectsLoading,
    loadTeams,
    ensureProjectsLoaded,
  } = useLinearOrganizationProjectOptions({
    selectedTeamId: pendingOrganizationTeamId,
    renderProjectIcon,
    renderTeamIcon,
    excludedTeamIds,
  });

  const organizationTeamOptions = teams;

  const selectedTeamName = useMemo(() => {
    if (!pendingOrganizationTeamId) return null;
    return teams.find((option) => option.value === pendingOrganizationTeamId)?.label ?? null;
  }, [pendingOrganizationTeamId, teams]);

  const selectedProjectName = useMemo(() => {
    if (!pendingProjectId) return null;
    return (
      document.projectName?.trim() ||
      filteredProjectOptions.find((option) => option.value === pendingProjectId)?.label ||
      null
    );
  }, [document.projectName, filteredProjectOptions, pendingProjectId]);

  const projectOptions = useMemo(() => {
    const noProjectOption: SearchableDropdownOption = {
      value: LINEAR_NO_PROJECT_VALUE,
      label: "No project",
      icon: <LinearProjectIcon title="No project" />,
      shortcut: searchableDropdownShortcut(0),
    };

    const projectItems = filteredProjectOptions.map((option, index) => ({
      ...option,
      shortcut: searchableDropdownShortcut(index + 1),
    }));

    const merged = [noProjectOption, ...projectItems];
    if (
      pendingProjectId &&
      !projectItems.some((option) => option.value === pendingProjectId)
    ) {
      merged.push({
        value: pendingProjectId,
        label: selectedProjectName ?? "Project",
        icon: <LinearProjectIcon title={selectedProjectName ?? "Project"} />,
        shortcut: searchableDropdownShortcut(merged.length),
      });
    }

    return merged;
  }, [filteredProjectOptions, pendingProjectId, selectedProjectName]);

  const hasPendingPropertyChanges = useMemo(() => {
    const savedProjectDropdownValue = linearDocumentProjectDropdownValue(selectedProjectId);
    return (
      pendingOrganizationTeamId !== savedOrganizationDropdownTeamId ||
      pendingProjectDropdownValue !== savedProjectDropdownValue
    );
  }, [
    pendingOrganizationTeamId,
    pendingProjectDropdownValue,
    savedOrganizationDropdownTeamId,
    selectedProjectId,
  ]);

  useEffect(() => {
    if (!inboxSection) return undefined;

    return registerLinearIssuePropertyShortcuts({
      openOrganization: () => {
        if (!openTeamRef.current) return false;
        openTeamRef.current();
        return true;
      },
      openProject: () => {
        if (!openProjectRef.current) return false;
        openProjectRef.current();
        return true;
      },
    });
  }, [inboxSection]);

  const handleTeamChange = useCallback(
    (teamId: string) => {
      if (!teamId.trim() || updatingProperties) return;

      setPendingOrganizationTeamId(teamId.trim());
      setPendingProjectDropdownValue(LINEAR_NO_PROJECT_VALUE);
      setLocalPropertiesError(null);
    },
    [updatingProperties],
  );

  const handleProjectChange = useCallback(
    (value: string) => {
      if (updatingProperties) return;
      setPendingProjectDropdownValue(value);
      setLocalPropertiesError(null);

      const nextProjectId = linearDocumentProjectIdFromDropdownValue(value);
      if (!nextProjectId || pendingOrganizationTeamId?.trim()) return;

      void fetchLinearProjectContext(nextProjectId)
        .then((contextResult) => {
          const resolvedTeamId = contextResult.context?.teamId?.trim();
          if (resolvedTeamId) {
            setPendingOrganizationTeamId(resolvedTeamId);
          }
        })
        .catch(() => {});
    },
    [pendingOrganizationTeamId, updatingProperties],
  );

  const handleApplyPropertyChanges = useCallback(() => {
    if (updatingProperties || !hasPendingPropertyChanges) return;

    const nextProjectId = pendingProjectId;
    const currentProjectId = selectedProjectId;
    const nextTeamId = pendingOrganizationTeamId?.trim();
    const savedTeamId = selectedTeamId;

    setLocalPropertiesError(null);

    void (async () => {
      const updates: { teamId?: string; projectId?: string | null } = {};

      if (nextTeamId && nextTeamId !== savedTeamId) {
        updates.teamId = nextTeamId;
      }

      if (nextProjectId !== currentProjectId) {
        updates.projectId = nextProjectId;
      } else if (updates.teamId && currentProjectId) {
        updates.projectId = null;
      }

      if (Object.keys(updates).length === 0) return;

      const result = await onUpdateProperties(updates);
      if (result.error) {
        setLocalPropertiesError(result.error);
        return;
      }

      pushNotification({
        kind: "success",
        title: "Document updated",
        message: "Organization and project changes were saved.",
        durationMs: 5000,
      });
    })();
  }, [
    hasPendingPropertyChanges,
    onUpdateProperties,
    pendingOrganizationTeamId,
    pendingProjectId,
    selectedProjectId,
    selectedTeamId,
    updatingProperties,
  ]);

  const handleMeetingDateTimeChange = useCallback(
    (nextDate: string | null, nextTime: string | null) => {
      if (!meetingsSection || updatingProperties) return;

      const nextTitle = buildMeetingDocumentTitle(
        nextDate,
        meetingTitleParts.displayTitle,
        nextTime,
      );
      if (nextTitle === document.title.trim()) return;

      void onUpdateProperties({ title: nextTitle });
    },
    [
      document.title,
      meetingTitleParts.displayTitle,
      meetingsSection,
      onUpdateProperties,
      updatingProperties,
    ],
  );

  const dropdownDisabled = updatingProperties || teamsLoading || projectsLoading;
  const projectDropdownDisabled = updatingProperties || projectsLoading;
  const displayError = localPropertiesError ?? propertiesError;

  return (
    <div className="linear-issue-details-panel">
      <LinearDocumentDetailsSection title="Properties">
        {meetingsSection ? (
          <MeetingDocumentDateTimePropertyDropdown
            date={meetingTitleParts.date}
            time={meetingTitleParts.time}
            onChange={handleMeetingDateTimeChange}
            disabled={updatingProperties}
          />
        ) : null}
        <LinearIssueDetailsPropertyDropdown
          value={pendingOrganizationTeamId}
          options={organizationTeamOptions}
          onChange={handleTeamChange}
          searchPlaceholder="Select organization…"
          searchShortcutLabel="O"
          ariaLabel={inboxSection ? "Select organization" : "Change organization"}
          registerOpenMenu={(open) => {
            openTeamRef.current = open
              ? () => {
                  void loadTeams();
                  open();
                }
              : null;
          }}
          disabled={dropdownDisabled}
          fallbackIcon={<LinearTeamIcon />}
          fallbackLabel={
            teamsLoading
              ? "Loading organizations…"
              : selectedTeamName ??
                (inboxSection ? "Select organization" : "No organization")
          }
        />
        <LinearIssueDetailsPropertyDropdown
          value={pendingProjectDropdownValue}
          options={projectOptions}
          onChange={handleProjectChange}
          searchPlaceholder="Select project…"
          searchShortcutLabel={inboxSection ? "⇧P" : "P"}
          ariaLabel={inboxSection ? "Select project" : "Change project"}
          registerOpenMenu={(open) => {
            openProjectRef.current = open
              ? () => {
                  ensureProjectsLoaded();
                  open();
                }
              : null;
          }}
          disabled={projectDropdownDisabled}
          fallbackIcon={<LinearProjectIcon title={selectedProjectName ?? "Project"} />}
          fallbackLabel={
            projectsLoading
              ? "Loading projects…"
              : selectedProjectName ?? (inboxSection ? "Select project" : "Select project…")
          }
        />
        {hasPendingPropertyChanges ? (
          <div className="linear-issue-details-convert">
            <button
              type="button"
              className="linear-issue-details-convert-button"
              disabled={updatingProperties}
              onClick={handleApplyPropertyChanges}
            >
              {updatingProperties ? "Applying…" : "Apply changes"}
            </button>
          </div>
        ) : null}
        {displayError ? (
          <p className="linear-issue-details-empty" role="alert">
            {displayError}
          </p>
        ) : null}
      </LinearDocumentDetailsSection>
    </div>
  );
}
