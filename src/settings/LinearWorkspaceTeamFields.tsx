import type { ReactNode } from "react";
import { useLinearTeams } from "../hooks/useLinearTeams";
import {
  LinearTeamIcon,
  SidebarContactsIcon,
  SidebarDailyIcon,
  SidebarInboxIcon,
  SidebarKnowledgeBaseIcon,
  SidebarLettersIcon,
  SidebarWorkoutsIcon,
} from "../app/SidebarNavIcons";
import { LinearTeamPicker } from "./LinearTeamPicker";
import { useAdministratorAccess } from "./useAdministratorAccess";

type SetupQuestionTermKind = "team" | "inbox" | "daily" | "workouts" | "letters" | "knowledge-base" | "address-book";

const SETUP_QUESTION_TERM_ICONS: Record<SetupQuestionTermKind, ReactNode> = {
  team: <LinearTeamIcon className="linear-connect-gate-field-label-term-icon" />,
  inbox: <SidebarInboxIcon className="linear-connect-gate-field-label-term-icon" />,
  daily: <SidebarDailyIcon className="linear-connect-gate-field-label-term-icon" />,
  workouts: <SidebarWorkoutsIcon className="linear-connect-gate-field-label-term-icon" />,
  letters: <SidebarLettersIcon className="linear-connect-gate-field-label-term-icon" />,
  "knowledge-base": <SidebarKnowledgeBaseIcon className="linear-connect-gate-field-label-term-icon" />,
  "address-book": <SidebarContactsIcon className="linear-connect-gate-field-label-term-icon" />,
};

function SetupQuestionTerm({
  kind,
  children,
}: {
  kind: SetupQuestionTermKind;
  children: string;
}) {
  return (
    <span className="linear-connect-gate-field-label-term">
      {SETUP_QUESTION_TERM_ICONS[kind]}
      <span>{children}</span>
    </span>
  );
}

function WorkspaceTeamQuestionLabel({
  layout,
  htmlFor,
  children,
}: {
  layout: "setup" | "settings";
  htmlFor: string;
  children: ReactNode;
}) {
  if (layout === "setup") {
    return (
      <label className="linear-connect-gate-field-label" htmlFor={htmlFor}>
        <span className="linear-connect-gate-field-label-content">{children}</span>
      </label>
    );
  }

  return (
    <label className="settings-field-label" htmlFor={htmlFor}>
      <span className="linear-connect-gate-field-label-content">{children}</span>
    </label>
  );
}

export function LinearWorkspaceTeamFields({
  layout = "settings",
  idPrefix = "linear-workspace",
  inboxTeamId,
  dailyTeamId,
  workoutsTeamId,
  lettersTeamId,
  knowledgeBaseTeamId,
  addressbookTeamId,
  workspaceTeamsLoading = false,
  onInboxTeamIdChange,
  onDailyTeamIdChange,
  onWorkoutsTeamIdChange,
  onLettersTeamIdChange,
  onKnowledgeBaseTeamIdChange,
  onAddressbookTeamIdChange,
  disabled = false,
  teamsEnabled = true,
}: {
  layout?: "setup" | "settings";
  idPrefix?: string;
  inboxTeamId: string;
  dailyTeamId: string;
  workoutsTeamId: string;
  lettersTeamId: string;
  knowledgeBaseTeamId: string;
  addressbookTeamId: string;
  workspaceTeamsLoading?: boolean;
  onInboxTeamIdChange: (teamId: string) => void;
  onDailyTeamIdChange: (teamId: string) => void;
  onWorkoutsTeamIdChange: (teamId: string) => void;
  onLettersTeamIdChange: (teamId: string) => void;
  onKnowledgeBaseTeamIdChange: (teamId: string) => void;
  onAddressbookTeamIdChange: (teamId: string) => void;
  disabled?: boolean;
  teamsEnabled?: boolean;
}) {
  const { isAdministrator } = useAdministratorAccess();
  const { teams, loading: teamsLoading, error } = useLinearTeams(teamsEnabled);
  const teamsUnavailable =
    teams.length === 0 && !teamsLoading && !workspaceTeamsLoading;
  const pickerLoading = teamsLoading || workspaceTeamsLoading;
  const pickerDisabled = disabled || teamsUnavailable;

  const inboxFieldId = `${idPrefix}-inbox-team`;
  const dailyFieldId = `${idPrefix}-daily-team`;
  const workoutsFieldId = `${idPrefix}-workouts-team`;
  const lettersFieldId = `${idPrefix}-letters-team`;
  const knowledgeBaseFieldId = `${idPrefix}-knowledge-base-team`;
  const addressbookFieldId = `${idPrefix}-addressbook-team`;

  const fieldClassName =
    layout === "setup" ? "linear-connect-gate-field" : "settings-linear-workspace-field";
  const pickerWrapperClassName =
    layout === "setup"
      ? "linear-connect-gate-field-picker"
      : "settings-row settings-row-project-picker";

  return (
    <>
      {layout === "settings" ? (
        <>
          <h3 className="settings-subsection-title">Workspace teams</h3>
          <p className="settings-hint">
            Choose which Linear teams hold your inbox, daily notes
            {isAdministrator ? ", workouts" : ""}, letters, knowledge base, and contacts. These are
            the same choices as initial setup.
          </p>
        </>
      ) : null}
      {error ? (
        <p
          className={
            layout === "setup"
              ? "linear-connect-gate-description linear-connect-gate-description--error"
              : "error-text settings-hint-spaced"
          }
        >
          {error}
        </p>
      ) : null}
      <div className={fieldClassName}>
        <WorkspaceTeamQuestionLabel layout={layout} htmlFor={inboxFieldId}>
          What <SetupQuestionTerm kind="team">Team</SetupQuestionTerm> should contain your{" "}
          <SetupQuestionTerm kind="inbox">Inbox</SetupQuestionTerm>?
        </WorkspaceTeamQuestionLabel>
        <div className={pickerWrapperClassName}>
          <LinearTeamPicker
            id={inboxFieldId}
            value={inboxTeamId}
            teams={teams}
            loading={pickerLoading}
            placeholder="Select a team…"
            searchPlaceholder="Search teams…"
            disabled={pickerDisabled}
            onChange={onInboxTeamIdChange}
          />
        </div>
      </div>
      <div className={fieldClassName}>
        <WorkspaceTeamQuestionLabel layout={layout} htmlFor={dailyFieldId}>
          What <SetupQuestionTerm kind="team">Team</SetupQuestionTerm> should contain your{" "}
          <SetupQuestionTerm kind="daily">Daily</SetupQuestionTerm>?
        </WorkspaceTeamQuestionLabel>
        <div className={pickerWrapperClassName}>
          <LinearTeamPicker
            id={dailyFieldId}
            value={dailyTeamId}
            teams={teams}
            loading={pickerLoading}
            placeholder="Select a team…"
            searchPlaceholder="Search teams…"
            disabled={pickerDisabled}
            onChange={onDailyTeamIdChange}
          />
        </div>
      </div>
      {isAdministrator ? (
        <div className={fieldClassName}>
          <WorkspaceTeamQuestionLabel layout={layout} htmlFor={workoutsFieldId}>
            What <SetupQuestionTerm kind="team">Team</SetupQuestionTerm> should contain your{" "}
            <SetupQuestionTerm kind="workouts">Workouts</SetupQuestionTerm>?
          </WorkspaceTeamQuestionLabel>
          <div className={pickerWrapperClassName}>
            <LinearTeamPicker
              id={workoutsFieldId}
              value={workoutsTeamId}
              teams={teams}
              loading={pickerLoading}
              placeholder="Select a team…"
              searchPlaceholder="Search teams…"
              disabled={pickerDisabled}
              onChange={onWorkoutsTeamIdChange}
            />
          </div>
        </div>
      ) : null}
      <div className={fieldClassName}>
        <WorkspaceTeamQuestionLabel layout={layout} htmlFor={lettersFieldId}>
          What <SetupQuestionTerm kind="team">Team</SetupQuestionTerm> should contain your{" "}
          <SetupQuestionTerm kind="letters">Letters</SetupQuestionTerm>?
        </WorkspaceTeamQuestionLabel>
        <div className={pickerWrapperClassName}>
          <LinearTeamPicker
            id={lettersFieldId}
            value={lettersTeamId}
            teams={teams}
            loading={pickerLoading}
            placeholder="Select a team…"
            searchPlaceholder="Search teams…"
            disabled={pickerDisabled}
            onChange={onLettersTeamIdChange}
          />
        </div>
      </div>
      <div className={fieldClassName}>
        <WorkspaceTeamQuestionLabel layout={layout} htmlFor={knowledgeBaseFieldId}>
          What <SetupQuestionTerm kind="team">Team</SetupQuestionTerm> should contain your{" "}
          <SetupQuestionTerm kind="knowledge-base">Knowledge Base</SetupQuestionTerm>?
        </WorkspaceTeamQuestionLabel>
        <div className={pickerWrapperClassName}>
          <LinearTeamPicker
            id={knowledgeBaseFieldId}
            value={knowledgeBaseTeamId}
            teams={teams}
            loading={pickerLoading}
            placeholder="Select a team…"
            searchPlaceholder="Search teams…"
            disabled={pickerDisabled}
            onChange={onKnowledgeBaseTeamIdChange}
          />
        </div>
      </div>
      <div className={fieldClassName}>
        <WorkspaceTeamQuestionLabel layout={layout} htmlFor={addressbookFieldId}>
          What <SetupQuestionTerm kind="team">Team</SetupQuestionTerm> contains your{" "}
          <SetupQuestionTerm kind="address-book">Contacts</SetupQuestionTerm>?
        </WorkspaceTeamQuestionLabel>
        <div className={pickerWrapperClassName}>
          <LinearTeamPicker
            id={addressbookFieldId}
            value={addressbookTeamId}
            teams={teams}
            loading={pickerLoading}
            placeholder="Select a team…"
            searchPlaceholder="Search teams…"
            disabled={pickerDisabled}
            onChange={onAddressbookTeamIdChange}
          />
        </div>
      </div>
    </>
  );
}
