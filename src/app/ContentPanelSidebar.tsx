import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import { SIDEBAR_VAULT_NAV_ITEM_IDS } from "./sidebarNavConfig";
import { LinearWorkspacePanel } from "./LinearWorkspacePanel";
import { VaultFolderExplorer } from "./VaultFolderExplorer";

export function ContentPanelSidebar({
  activeVaultNavItem,
  vaultExplorerEnabled,
}: {
  activeVaultNavItem: SidebarNavItemId | null;
  vaultExplorerEnabled: boolean;
}) {
  const showEmptyState = !activeVaultNavItem;

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
