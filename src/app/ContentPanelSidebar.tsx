import { useEffect } from "react";
import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import { resolveTodayDailyNoteDocument } from "../lib/resolveTodayDailyNoteDocument";
import { resolveLatestKnowledgeBaseDocument } from "../lib/resolveLatestKnowledgeBaseDocument";
import { resolveLatestMeetingDocument } from "../lib/resolveLatestMeetingDocument";
import { SIDEBAR_VAULT_NAV_ITEM_IDS, isSidebarPrimaryNavItem } from "./sidebarNavConfig";
import { LinearWorkspacePanel } from "./LinearWorkspacePanel";
import { OrganizationTeamsList } from "./OrganizationTeamsList";
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

    if (activeVaultNavItem === "meetings") {
      let cancelled = false;
      void resolveLatestMeetingDocument()
        .then((document) => {
          if (cancelled) return;
          if (document) {
            setActiveVaultDocument(document);
            return;
          }
          clearActiveVaultDocument();
        })
        .catch(() => {
          if (cancelled) return;
          clearActiveVaultDocument();
        });
      return () => {
        cancelled = true;
      };
    }

    if (activeVaultNavItem === "knowledge-base") {
      let cancelled = false;
      void resolveLatestKnowledgeBaseDocument()
        .then((document) => {
          if (cancelled) return;
          if (document) {
            setActiveVaultDocument(document);
            return;
          }
          clearActiveVaultDocument();
        })
        .catch(() => {
          if (cancelled) return;
          clearActiveVaultDocument();
        });
      return () => {
        cancelled = true;
      };
    }

    if (activeVaultNavItem === "workouts") {
      clearActiveVaultDocument();
      return;
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
        {SIDEBAR_VAULT_NAV_ITEM_IDS.map((itemId) =>
          activeVaultNavItem === itemId ? (
            <div key={itemId} className="content-panel-sidebar-pane">
              {itemId === "organizations" ? (
                <OrganizationTeamsList enabled={vaultExplorerEnabled} />
              ) : (
                <VaultFolderExplorer activeNavItem={itemId} enabled={vaultExplorerEnabled} />
              )}
            </div>
          ) : null,
        )}

        {activeVaultNavItem === "projects" ? (
          <div className="content-panel-sidebar-pane">
            <LinearWorkspacePanel enabled={vaultExplorerEnabled} />
          </div>
        ) : null}

        {showEmptyState ? (
          <p className="content-panel-sidebar-empty">
            Choose a section in the left navigation to browse vault files or Linear workspace items.
          </p>
        ) : null}
      </div>
    </div>
  );
}
