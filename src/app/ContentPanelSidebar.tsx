import { useEffect } from "react";
import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import { resolveTodayDailyNoteDocument } from "../lib/resolveTodayDailyNoteDocument";
import { SIDEBAR_VAULT_NAV_ITEM_IDS, isSidebarPrimaryNavItem } from "./sidebarNavConfig";
import { LinearWorkspacePanel } from "./LinearWorkspacePanel";
import { VaultFolderExplorer } from "./VaultFolderExplorer";
import { useContentPanelNavigation } from "./contentPanelNavigation";

export function ContentPanelSidebar({
  activeVaultNavItem,
  vaultExplorerEnabled,
}: {
  activeVaultNavItem: SidebarNavItemId | null;
  vaultExplorerEnabled: boolean;
}) {
  const {
    clearActiveVaultDocument,
    clearActiveLinearDocument,
    clearActiveLinearIssue,
    setActiveVaultDocument,
    setLinearSelection,
  } = useContentPanelNavigation();
  const showEmptyState = !activeVaultNavItem;

  useEffect(() => {
    if (!vaultExplorerEnabled || !activeVaultNavItem) return;

    if (isSidebarPrimaryNavItem(activeVaultNavItem)) {
      setLinearSelection(null);
      clearActiveLinearDocument();
      clearActiveLinearIssue();
    }

    if (activeVaultNavItem === "daily") {
      let cancelled = false;
      void resolveTodayDailyNoteDocument().then((document) => {
        if (cancelled || !document) return;
        setActiveVaultDocument(document);
      });
      return () => {
        cancelled = true;
      };
    }

    clearActiveVaultDocument();
  }, [
    activeVaultNavItem,
    clearActiveLinearDocument,
    clearActiveLinearIssue,
    clearActiveVaultDocument,
    setActiveVaultDocument,
    setLinearSelection,
    vaultExplorerEnabled,
  ]);

  return (
    <div className="content-panel-sidebar">
      <div className="content-panel-sidebar-body">
        {SIDEBAR_VAULT_NAV_ITEM_IDS.map((itemId) => (
          <div
            key={itemId}
            className="content-panel-sidebar-pane"
            hidden={activeVaultNavItem !== itemId}
          >
            <VaultFolderExplorer
              activeNavItem={itemId}
              enabled={vaultExplorerEnabled && activeVaultNavItem === itemId}
            />
          </div>
        ))}

        <div className="content-panel-sidebar-pane" hidden={activeVaultNavItem !== "projects"}>
          <LinearWorkspacePanel
            enabled={vaultExplorerEnabled && activeVaultNavItem === "projects"}
          />
        </div>

        {showEmptyState ? (
          <p className="content-panel-sidebar-empty">
            Choose a section in the left navigation to browse vault files or Linear workspace items.
          </p>
        ) : null}
      </div>
    </div>
  );
}
