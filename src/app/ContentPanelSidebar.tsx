import { useEffect } from "react";
import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import { resolveTodayDailyNoteDocument } from "../lib/resolveTodayDailyNoteDocument";
import { resolveLatestKnowledgeBaseDocument } from "../lib/resolveLatestKnowledgeBaseDocument";
import { resolveLatestMeetingDocument } from "../lib/resolveLatestMeetingDocument";
import { isLinearProductMode } from "../lib/productMode";
import { SIDEBAR_VAULT_NAV_ITEM_IDS, isSidebarPrimaryNavItem } from "./sidebarNavConfig";
import { LinearDailyExplorer } from "./LinearDailyExplorer";
import { LinearInboxExplorer } from "./LinearInboxExplorer";
import { LinearLettersExplorer } from "./LinearLettersExplorer";
import { LinearKnowledgeBaseExplorer } from "./LinearKnowledgeBaseExplorer";
import { LinearMeetingsExplorer } from "./LinearMeetingsExplorer";
import { LinearContactsExplorer } from "./LinearContactsExplorer";
import { LinearOrganizationsExplorer } from "./LinearOrganizationsExplorer";
import { LinearWorkspacePanel } from "./LinearWorkspacePanel";
import { OrganizationTeamsList } from "./OrganizationTeamsList";
import { VaultFolderExplorer } from "./VaultFolderExplorer";
import { useContentPanelNavigation } from "./contentPanelNavigation";

export function ContentPanelSidebar({
  activeVaultNavItem,
  inboxLinearTeamId,
  dailyLinearTeamId,
  workoutsLinearTeamId,
  lettersLinearTeamId,
  knowledgeBaseLinearTeamId,
  addressbookLinearTeamId,
  linearWorkspaceEnabled,
  vaultExplorerEnabled,
}: {
  activeVaultNavItem: SidebarNavItemId | null;
  inboxLinearTeamId: string | null;
  dailyLinearTeamId: string | null;
  workoutsLinearTeamId: string | null;
  lettersLinearTeamId: string | null;
  knowledgeBaseLinearTeamId: string | null;
  addressbookLinearTeamId: string | null;
  linearWorkspaceEnabled: boolean;
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
  const linearInboxTeamId = inboxLinearTeamId?.trim() ?? "";
  const linearDailyTeamId = dailyLinearTeamId?.trim() ?? "";
  const linearLettersTeamId = lettersLinearTeamId?.trim() ?? "";
  const linearKnowledgeBaseTeamId = knowledgeBaseLinearTeamId?.trim() ?? "";
  const linearAddressbookTeamId = addressbookLinearTeamId?.trim() ?? "";
  const workspaceTeamConfig = {
    inboxLinearTeamId,
    dailyLinearTeamId,
    workoutsLinearTeamId,
    lettersLinearTeamId,
    knowledgeBaseLinearTeamId,
    addressbookLinearTeamId,
  };
  const linearInboxEnabled = linearWorkspaceEnabled && Boolean(linearInboxTeamId);
  const linearDailyEnabled = linearWorkspaceEnabled && Boolean(linearDailyTeamId);
  const linearLettersEnabled = linearWorkspaceEnabled && Boolean(linearLettersTeamId);
  const linearKnowledgeBaseEnabled = linearWorkspaceEnabled && Boolean(linearKnowledgeBaseTeamId);
  const linearContactsEnabled = linearWorkspaceEnabled && Boolean(linearAddressbookTeamId);
  const linearMeetingsEnabled = isLinearProductMode() && linearWorkspaceEnabled;
  const linearOrganizationsEnabled = isLinearProductMode() && linearWorkspaceEnabled;

  const navSidebarEnabled =
    vaultExplorerEnabled ||
    (linearWorkspaceEnabled && activeVaultNavItem === "projects") ||
    (linearInboxEnabled && activeVaultNavItem === "inbox") ||
    (linearDailyEnabled && activeVaultNavItem === "daily") ||
    (linearLettersEnabled && activeVaultNavItem === "letters") ||
    (linearMeetingsEnabled && activeVaultNavItem === "meetings") ||
    (linearKnowledgeBaseEnabled && activeVaultNavItem === "knowledge-base") ||
    (linearContactsEnabled && activeVaultNavItem === "contacts") ||
    (linearOrganizationsEnabled && activeVaultNavItem === "organizations");

  useEffect(() => {
    if (!activeVaultNavItem) return;

    if (isSidebarPrimaryNavItem(activeVaultNavItem)) {
      setLinearSelection(null);
      clearActiveLinearDocument();
      clearActiveLinearIssue();
    }
  }, [
    activeVaultNavItem,
    clearActiveLinearDocument,
    clearActiveLinearIssue,
    setLinearSelection,
  ]);

  useEffect(() => {
    if (!navSidebarEnabled || !activeVaultNavItem) return;

    if (activeVaultNavItem === "daily") {
      if (linearDailyEnabled) {
        clearActiveVaultDocument();
        return;
      }

      let cancelled = false;
      void resolveTodayDailyNoteDocument().then((document) => {
        if (cancelled || !document) return;
        setActiveVaultDocument(document);
      });
      return () => {
        cancelled = true;
      };
    }

    if (activeVaultNavItem === "letters") {
      if (linearLettersEnabled) {
        clearActiveVaultDocument();
        return;
      }
    }

    if (activeVaultNavItem === "contacts") {
      if (linearContactsEnabled) {
        clearActiveVaultDocument();
        return;
      }
    }

    if (activeVaultNavItem === "meetings") {
      if (linearMeetingsEnabled) {
        clearActiveVaultDocument();
        return;
      }

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
      if (linearKnowledgeBaseEnabled) {
        clearActiveVaultDocument();
        return;
      }

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

    clearActiveVaultDocument();
  }, [
    activeVaultNavItem,
    clearActiveLinearDocument,
    clearActiveLinearIssue,
    clearActiveVaultDocument,
    linearDailyEnabled,
    linearKnowledgeBaseEnabled,
    linearContactsEnabled,
    linearLettersEnabled,
    linearMeetingsEnabled,
    setActiveVaultDocument,
    setLinearSelection,
    navSidebarEnabled,
  ]);

  return (
    <div className="content-panel-sidebar">
      <div className="content-panel-sidebar-body">
        {SIDEBAR_VAULT_NAV_ITEM_IDS.map((itemId) =>
          activeVaultNavItem === itemId ? (
            <div key={itemId} className="content-panel-sidebar-pane">
              {itemId === "inbox" && linearInboxEnabled ? (
                <LinearInboxExplorer teamId={linearInboxTeamId} enabled={linearInboxEnabled} />
              ) : itemId === "daily" && linearDailyEnabled ? (
                <LinearDailyExplorer teamId={linearDailyTeamId} enabled={linearDailyEnabled} />
              ) : itemId === "letters" && linearLettersEnabled ? (
                <LinearLettersExplorer teamId={linearLettersTeamId} enabled={linearLettersEnabled} />
              ) : itemId === "meetings" && linearMeetingsEnabled ? (
                <LinearMeetingsExplorer teamId={linearDailyTeamId} enabled={linearMeetingsEnabled} />
              ) : itemId === "knowledge-base" && linearKnowledgeBaseEnabled ? (
                <LinearKnowledgeBaseExplorer
                  teamId={linearKnowledgeBaseTeamId}
                  enabled={linearKnowledgeBaseEnabled}
                />
              ) : itemId === "organizations" && linearOrganizationsEnabled ? (
                <LinearOrganizationsExplorer
                  enabled={linearOrganizationsEnabled}
                  workspaceTeamConfig={workspaceTeamConfig}
                />
              ) : itemId === "contacts" && linearContactsEnabled ? (
                <LinearContactsExplorer teamId={linearAddressbookTeamId} enabled={linearContactsEnabled} />
              ) : itemId === "organizations" ? (
                <OrganizationTeamsList
                  enabled={vaultExplorerEnabled}
                  workspaceTeamConfig={workspaceTeamConfig}
                />
              ) : (
                <VaultFolderExplorer activeNavItem={itemId} enabled={vaultExplorerEnabled} />
              )}
            </div>
          ) : null,
        )}

        {activeVaultNavItem === "projects" ? (
          <div className="content-panel-sidebar-pane">
            <LinearWorkspacePanel
              enabled={linearWorkspaceEnabled}
              workspaceTeamConfig={workspaceTeamConfig}
            />
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
