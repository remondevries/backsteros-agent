import { useCallback } from "react";
import { useContentPanelNavigation } from "../app/contentPanelNavigation";
import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import type { SettingsTabId } from "../settings/settingsTabs";
import type { CommandPaletteItem } from "./types";

export function useCommandPaletteActions({
  onVaultNavItemChange,
  onVaultNavItemChangeQuiet,
  onOpenSettings,
  onSettingsTabChange,
  onClose,
}: {
  onVaultNavItemChange: (item: SidebarNavItemId | null) => void;
  /** Switches sidebar nav without clearing Linear project/issue/document focus. */
  onVaultNavItemChangeQuiet?: (item: SidebarNavItemId) => void;
  onOpenSettings: () => void;
  onSettingsTabChange: (tab: SettingsTabId) => void;
  onClose: () => void;
}) {
  const {
    clearActiveLinearDocument,
    clearActiveLinearIssue,
    clearActiveVaultDocument,
    openLinearProjectDocument,
    resetProjectsOverview,
    setActiveLinearIssue,
    setActiveVaultDocument,
    setLinearSelection,
  } = useContentPanelNavigation();

  return useCallback(
    (item: CommandPaletteItem) => {
      onClose();

      switch (item.kind) {
        case "navigate": {
          if (item.navItemId !== null) {
            clearActiveVaultDocument();
            clearActiveLinearIssue();
            clearActiveLinearDocument();
            resetProjectsOverview();
            onVaultNavItemChange(item.navItemId);
          }
          return;
        }
        case "settings": {
          if (item.settingsTab) {
            onSettingsTabChange(item.settingsTab);
          }
          onOpenSettings();
          return;
        }
        case "vault-note": {
          clearActiveLinearIssue();
          clearActiveLinearDocument();
          resetProjectsOverview();
          onVaultNavItemChange(item.navItemId);
          setActiveVaultDocument({
            path: item.path,
            title: item.title,
          });
          return;
        }
        case "linear-issue": {
          clearActiveVaultDocument();
          clearActiveLinearDocument();
          setActiveLinearIssue({
            id: item.issue.id,
            identifier: item.issue.identifier ?? item.issue.id,
            title: item.issue.title,
            status: item.issue.status,
            stateType: item.issue.stateType,
            projectName: item.issue.projectName?.trim() || undefined,
          });
          return;
        }
        case "linear-project": {
          clearActiveVaultDocument();
          clearActiveLinearIssue();
          clearActiveLinearDocument();
          onVaultNavItemChange("projects");
          setLinearSelection({
            kind: "project",
            id: item.projectId,
            name: item.projectName,
          });
          return;
        }
        case "linear-team": {
          clearActiveVaultDocument();
          clearActiveLinearIssue();
          clearActiveLinearDocument();
          resetProjectsOverview();
          onVaultNavItemChange("organizations");
          setLinearSelection({
            kind: "team",
            id: item.teamId,
            name: item.teamName,
          });
          return;
        }
        case "linear-customer": {
          clearActiveVaultDocument();
          clearActiveLinearIssue();
          clearActiveLinearDocument();
          resetProjectsOverview();
          onVaultNavItemChange("organizations");
          return;
        }
        case "linear-document": {
          const switchNav = onVaultNavItemChangeQuiet ?? onVaultNavItemChange;
          switchNav("projects");
          openLinearProjectDocument(
            {
              id: item.documentId,
              title: item.title,
              projectId: item.projectId,
            },
            item.projectId && item.projectName
              ? { kind: "project", id: item.projectId, name: item.projectName }
              : null,
          );
          return;
        }
        default:
          return;
      }
    },
    [
      clearActiveLinearDocument,
      clearActiveLinearIssue,
      clearActiveVaultDocument,
      onClose,
      onOpenSettings,
      onSettingsTabChange,
      onVaultNavItemChange,
      onVaultNavItemChangeQuiet,
      openLinearProjectDocument,
      resetProjectsOverview,
      setActiveLinearIssue,
      setActiveVaultDocument,
      setLinearSelection,
    ],
  );
}
