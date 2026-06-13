import type { ReactNode } from "react";
import { useContentPanelNavigation } from "./contentPanelNavigation";
import { ContentPanelEmptyState } from "./ContentPanelEmptyState";
import { shouldShowPrimaryNavEmptyState } from "./sidebarNavConfig";
import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import { LinearIssueView } from "./project-issues/LinearIssueView";
import { LinearProjectContent } from "./LinearProjectContent";
import { LinearDocumentView } from "./project-documents/LinearDocumentView";
import { LinearProjectsTableView } from "./projects/LinearProjectsTableView";
import { VaultDocumentView } from "./project-documents/VaultDocumentView";
import { WorkoutsDashboard } from "./workouts/WorkoutsDashboard";
import { WorkoutSessionView } from "./workouts/WorkoutSessionView";
import { workoutDateKeyFromPath } from "../lib/workouts/workoutDays";

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
  vaultStructureEnabled,
  activeVaultNavItem,
}: {
  children: ReactNode;
  settingsOpen: boolean;
  vaultStructureEnabled: boolean;
  activeVaultNavItem: SidebarNavItemId | null;
}) {
  const { linearSelection, activeVaultDocument, activeLinearDocument, activeLinearIssue } =
    useContentPanelNavigation();
  const showWorkoutSession =
    !settingsOpen && isWorkoutSessionPath(activeVaultDocument?.path ?? null);
  const showWorkoutsDashboard =
    !settingsOpen &&
    activeVaultNavItem === "workouts" &&
    !showWorkoutSession &&
    activeLinearDocument === null &&
    activeLinearIssue === null &&
    linearSelection === null;
  const showLinearDocument = !settingsOpen && activeLinearDocument !== null;
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
    vaultStructureEnabled &&
    activeVaultNavItem !== null &&
    shouldShowPrimaryNavEmptyState(activeVaultNavItem) &&
    !hasFocusedContent;
  const hideDefaultMainContent = shouldHideDefaultMainContent({
    activeVaultNavItem,
    linearSelection,
    hasFocusedContent,
  });
  const showProjectsBrowse = !settingsOpen && hideDefaultMainContent;
  const showDefault =
    !settingsOpen &&
    !hasFocusedContent &&
    !showVaultEmptyState &&
    activeVaultNavItem !== "daily" &&
    !hideDefaultMainContent;
  const showMainChildren = settingsOpen || showDefault;

  return (
    <div className="content-panel-slot-stack">
      <div className="content-panel-main-slot" hidden={!showProjectsBrowse}>
        <LinearProjectsTableView enabled={vaultStructureEnabled} />
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
        {activeLinearIssue ? <LinearIssueView issueId={activeLinearIssue.id} /> : null}
      </div>
      <div className="content-panel-main-slot" hidden={!showLinearDocument}>
        {activeLinearDocument ? (
          <LinearDocumentView
            documentId={activeLinearDocument.id}
            projectId={activeLinearDocument.projectId}
          />
        ) : null}
      </div>
      <div className="content-panel-main-slot" hidden={!showWorkoutsDashboard}>
        <WorkoutsDashboard />
      </div>
      <div className="content-panel-main-slot" hidden={!showWorkoutSession}>
        {activeVaultDocument && showWorkoutSession ? (
          <WorkoutSessionView path={activeVaultDocument.path} />
        ) : null}
      </div>
      <div className="content-panel-main-slot" hidden={!showVaultDocument}>
        {activeVaultDocument ? <VaultDocumentView path={activeVaultDocument.path} /> : null}
      </div>
    </div>
  );
}
