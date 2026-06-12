import type { ReactNode } from "react";
import { useContentPanelNavigation } from "./contentPanelNavigation";
import { LinearIssueView } from "./project-issues/LinearIssueView";
import { LinearProjectContent } from "./LinearProjectContent";
import { VaultDocumentView } from "./project-documents/VaultDocumentView";

export function ContentPanelMainSlot({
  children,
  settingsOpen,
  vaultStructureEnabled,
}: {
  children: ReactNode;
  settingsOpen: boolean;
  vaultStructureEnabled: boolean;
}) {
  const { linearSelection, activeVaultDocument, activeLinearIssue } = useContentPanelNavigation();
  const showVaultDocument = !settingsOpen && activeVaultDocument !== null;
  const showLinearIssue =
    !settingsOpen && activeLinearIssue !== null && !showVaultDocument;
  const showLinearWorkspace =
    !settingsOpen && linearSelection !== null && !showVaultDocument && !showLinearIssue;
  const showDefault =
    !settingsOpen && !showLinearWorkspace && !showVaultDocument && !showLinearIssue;

  return (
    <div className="content-panel-slot-stack">
      <div className="content-panel-main-slot" hidden={!showDefault}>
        {children}
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
      <div className="content-panel-main-slot" hidden={!showVaultDocument}>
        {activeVaultDocument ? <VaultDocumentView path={activeVaultDocument.path} /> : null}
      </div>
    </div>
  );
}
