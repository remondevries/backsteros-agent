import type { ReactNode } from "react";
import { useContentPanelNavigation } from "./contentPanelNavigation";
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
  const { linearSelection, activeVaultDocument } = useContentPanelNavigation();
  const showVaultDocument = !settingsOpen && activeVaultDocument !== null;
  const showLinearWorkspace =
    !settingsOpen && linearSelection !== null && !showVaultDocument;
  const showDefault = !settingsOpen && !showLinearWorkspace && !showVaultDocument;

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
      <div className="content-panel-main-slot" hidden={!showVaultDocument}>
        {activeVaultDocument ? <VaultDocumentView path={activeVaultDocument.path} /> : null}
      </div>
    </div>
  );
}
