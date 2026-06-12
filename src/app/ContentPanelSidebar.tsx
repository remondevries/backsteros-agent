import {
  isVaultSidebarNavItem,
  type SidebarNavItemId,
} from "../lib/sidebarNavItems";
import { LinearWorkspacePanel } from "./LinearWorkspacePanel";
import { VaultFolderExplorer } from "./VaultFolderExplorer";

export function ContentPanelSidebar({
  activeVaultNavItem,
  vaultExplorerEnabled,
}: {
  activeVaultNavItem: SidebarNavItemId | null;
  vaultExplorerEnabled: boolean;
}) {
  return (
    <div className="content-panel-sidebar">
      <div className="content-panel-sidebar-body">
        {activeVaultNavItem === "projects" ? (
          <LinearWorkspacePanel enabled={vaultExplorerEnabled} />
        ) : activeVaultNavItem && isVaultSidebarNavItem(activeVaultNavItem) ? (
          <VaultFolderExplorer activeNavItem={activeVaultNavItem} enabled={vaultExplorerEnabled} />
        ) : (
          <p className="content-panel-sidebar-empty">
            Choose a section in the left navigation to browse vault files or Linear workspace items.
          </p>
        )}
      </div>
    </div>
  );
}
