import type { ReactNode } from "react";
import { useContentPanelNavigation } from "./contentPanelNavigation";
import { ContentPanelEmptyState } from "./ContentPanelEmptyState";
import { shouldShowPrimaryNavEmptyState } from "./sidebarNavConfig";
import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import { LinearIssueView } from "./project-issues/LinearIssueView";
import { LinearProjectContent } from "./LinearProjectContent";
import { LinearDocumentView } from "./project-documents/LinearDocumentView";
import { LetterComposeView } from "./project-documents/LetterComposeView";
import { isLetterComposeDraftDocumentId } from "../lib/letterComposeDraft";
import { LinearProjectsTableView } from "./projects/LinearProjectsTableView";
import { VaultDocumentView } from "./project-documents/VaultDocumentView";
import { WorkoutsDashboard } from "./workouts/WorkoutsDashboard";
import { WorkoutSessionPanel } from "./workouts/WorkoutSessionPanel";
import { WorkoutsAreaContent } from "./workouts/WorkoutsAreaContent";
import { workoutDateKeyFromPath } from "../lib/workouts/workoutDays";
import type { LinearSidebarTeamConfig } from "./sidebarNavConfig";

export function isWorkoutSessionPath(path: string | undefined | null): boolean {
  if (!path) return false;
  return workoutDateKeyFromPath(path) != null;
}

export function shouldHideDefaultMainContent({
  activeVaultNavItem,
  linearSelection,
  hasFocusedContent,
}: {
  activeVaultNavItem: SidebarNavItemId | null;
  linearSelection: unknown;
  hasFocusedContent: boolean;
}): boolean {
  return (
    activeVaultNavItem === "projects" &&
    linearSelection === null &&
    !hasFocusedContent
  );
}

export function ContentPanelMainSlot({
  children,
  settingsOpen,
  linearWorkspaceEnabled,
  vaultStructureEnabled,
  activeVaultNavItem,
  lettersLinearTeamId = null,
  inboxLinearTeamId = null,
  workoutsLinearTeamId = null,
  workspaceTeamConfig = {},
}: {
  children: ReactNode;
  settingsOpen: boolean;
  linearWorkspaceEnabled: boolean;
  vaultStructureEnabled: boolean;
  activeVaultNavItem: SidebarNavItemId | null;
  lettersLinearTeamId?: string | null;
  inboxLinearTeamId?: string | null;
  workoutsLinearTeamId?: string | null;
  workspaceTeamConfig?: LinearSidebarTeamConfig;
}) {
  const { linearSelection, activeVaultDocument, activeLinearDocument, activeLinearIssue, linearWorkspaceView } =
    useContentPanelNavigation();
  const showWorkoutSession =
    !settingsOpen &&
    isWorkoutSessionPath(activeVaultDocument?.path ?? null) &&
    activeLinearIssue === null;
  const showWorkoutsDashboard =
    !settingsOpen &&
    activeVaultNavItem === "workouts" &&
    !showWorkoutSession &&
    activeLinearDocument === null &&
    activeLinearIssue === null &&
    linearSelection === null;
  const showProjectMeetingsDocument =
    linearSelection?.kind === "project" && linearWorkspaceView === "meetings";
  const showMeetingsDocumentLayout =
    activeVaultNavItem === "meetings" || showProjectMeetingsDocument;
  const showInboxDocumentLayout = activeVaultNavItem === "inbox";
  const showLettersDocumentLayout =
    activeVaultNavItem === "letters" ||
    (linearSelection?.kind === "team" && linearWorkspaceView === "letters");
  const lettersLabelTeamId = showLettersDocumentLayout
    ? linearSelection?.kind === "team"
      ? linearSelection.id
      : lettersLinearTeamId?.trim() || null
    : null;
  const showLetterCompose =
    !settingsOpen &&
    activeLinearDocument !== null &&
    isLetterComposeDraftDocumentId(activeLinearDocument.id) &&
    Boolean(lettersLabelTeamId?.trim());
  const showLinearDocument = !settingsOpen && activeLinearDocument !== null && !showLetterCompose;
  const showVaultDocument =
    !settingsOpen &&
    activeVaultDocument !== null &&
    !showWorkoutSession &&
    !showLinearDocument;
  const showLinearIssue =
    !settingsOpen && activeLinearIssue !== null && !showVaultDocument && !showLinearDocument;
  const showLinearWorkspace =
    !settingsOpen &&
    linearSelection !== null &&
    (activeVaultNavItem === "projects" || activeVaultNavItem === "organizations") &&
    !showVaultDocument &&
    !showLinearDocument &&
    !showLinearIssue;
  const hasFocusedContent =
    showVaultDocument ||
    showWorkoutSession ||
    showWorkoutsDashboard ||
    showLinearDocument ||
    showLinearIssue ||
    showLinearWorkspace;
  const showVaultEmptyState =
    !settingsOpen &&
    activeVaultNavItem !== null &&
    shouldShowPrimaryNavEmptyState(activeVaultNavItem) &&
    !hasFocusedContent &&
    (vaultStructureEnabled ||
      (linearWorkspaceEnabled &&
        (activeVaultNavItem === "inbox" ||
          activeVaultNavItem === "meetings" ||
          activeVaultNavItem === "contacts" ||
          activeVaultNavItem === "organizations")));
  const hideDefaultMainContent = shouldHideDefaultMainContent({
    activeVaultNavItem,
    linearSelection,
    hasFocusedContent,
  });
  const showProjectsBrowse = !settingsOpen && hideDefaultMainContent;
  const showMainChildren = settingsOpen;
  const showWorkoutsArea = showWorkoutsDashboard || showWorkoutSession;

  return (
    <div className="content-panel-slot-stack">
      <div className="content-panel-main-slot" hidden={!showProjectsBrowse}>
        <LinearProjectsTableView
          enabled={linearWorkspaceEnabled && showProjectsBrowse}
          workspaceTeamConfig={workspaceTeamConfig}
        />
      </div>
      <div className="content-panel-main-slot" hidden={!showMainChildren}>
        {children}
      </div>
      <div className="content-panel-main-slot" hidden={!showVaultEmptyState}>
        {activeVaultNavItem && showVaultEmptyState ? (
          <ContentPanelEmptyState activeVaultNavItem={activeVaultNavItem} />
        ) : null}
      </div>
      <div className="content-panel-main-slot" hidden={!showLinearWorkspace}>
        {linearSelection ? (
          <LinearProjectContent
            selection={linearSelection}
            vaultStructureEnabled={vaultStructureEnabled}
          />
        ) : null}
      </div>
      <div className="content-panel-main-slot" hidden={!showLinearIssue}>
        {activeLinearIssue ? (
          <LinearIssueView
            issueId={activeLinearIssue.id}
            workspaceTeamConfig={workspaceTeamConfig}
            showDetailsPanel={
              activeVaultNavItem !== "contacts" && activeVaultNavItem !== "workouts"
            }
            showInboxConvertBar={activeVaultNavItem === "inbox"}
            showSubIssueTitles={activeVaultNavItem === "contacts"}
          />
        ) : null}
      </div>
      <div className="content-panel-main-slot" hidden={!showLetterCompose}>
        {activeLinearDocument && showLetterCompose ? (
          <LetterComposeView
            documentDraftId={activeLinearDocument.id}
            teamId={lettersLabelTeamId ?? ""}
            labelTeamId={lettersLabelTeamId}
            workspaceTeamConfig={workspaceTeamConfig}
            initialTitle={activeLinearDocument.title}
          />
        ) : null}
      </div>
      <div className="content-panel-main-slot" hidden={!showLinearDocument}>
        {activeLinearDocument ? (
          <LinearDocumentView
            documentId={activeLinearDocument.id}
            projectId={activeLinearDocument.projectId}
            activeVaultNavItem={activeVaultNavItem}
            dailyJournalSection={activeVaultNavItem === "daily"}
            meetingsSection={showMeetingsDocumentLayout}
            lettersSection={showLettersDocumentLayout}
            lettersTeamId={lettersLabelTeamId}
            inboxSection={showInboxDocumentLayout}
            inboxTeamId={inboxLinearTeamId}
            workoutsLinearTeamId={workoutsLinearTeamId}
            workspaceTeamConfig={workspaceTeamConfig}
            showDetailsPanel={showMeetingsDocumentLayout || showInboxDocumentLayout}
          />
        ) : null}
      </div>
      {showWorkoutsArea ? (
        <div className="content-panel-main-slot">
          <WorkoutsAreaContent showPeriodTabs={showWorkoutsDashboard}>
            {showWorkoutsDashboard ? (
              <WorkoutsDashboard
                teamId={workoutsLinearTeamId}
                enabled={activeVaultNavItem === "workouts"}
              />
            ) : null}
            {showWorkoutSession && activeVaultDocument ? (
              <WorkoutSessionPanel
                teamId={workoutsLinearTeamId?.trim() ?? ""}
                dateKey={workoutDateKeyFromPath(activeVaultDocument.path) ?? ""}
                enabled={activeVaultNavItem === "workouts" && Boolean(workoutsLinearTeamId?.trim())}
              />
            ) : null}
          </WorkoutsAreaContent>
        </div>
      ) : null}
      <div className="content-panel-main-slot" hidden={!showVaultDocument}>
        {activeVaultDocument ? (
          <VaultDocumentView
            path={activeVaultDocument.path}
            activeVaultNavItem={activeVaultNavItem}
            dailyJournalSection={activeVaultNavItem === "daily"}
            meetingsSection={activeVaultNavItem === "meetings"}
            workoutsLinearTeamId={workoutsLinearTeamId}
          />
        ) : null}
      </div>
    </div>
  );
}
