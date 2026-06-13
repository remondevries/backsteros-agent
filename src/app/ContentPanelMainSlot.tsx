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
  const showLinearDocument = !settingsOpen && activeLinearDocument !== null;
  const showVaultDocument =
    !settingsOpen && activeVaultDocument !== null && !showLinearDocument;
  const showLinearIssue =
    !settingsOpen && activeLinearIssue !== null && !showVaultDocument && !showLinearDocument;
  const showLinearWorkspace =
    !settingsOpen &&
    linearSelection !== null &&
    !showVaultDocument &&
    !showLinearDocument &&
    !showLinearIssue;
  const hasFocusedContent =
    showVaultDocument || showLinearDocument || showLinearIssue || showLinearWorkspace;
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
      <div className="content-panel-main-slot" hidden={!showVaultDocument}>
        {activeVaultDocument ? <VaultDocumentView path={activeVaultDocument.path} /> : null}
      </div>
    </div>
  );
}
