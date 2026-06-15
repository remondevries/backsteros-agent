import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import type { SettingsTabId } from "../settings/settingsTabs";
import type { LinearSidebarTeamConfig } from "../app/sidebarNavConfig";
import { useLeaderKeyRegistration } from "./leaderSequenceGate";
import { AppNavigationShortcuts } from "./AppNavigationShortcuts";
import { ContentListNavigationShortcuts } from "./ContentListNavigationShortcuts";
import { ContentPanelBackShortcuts } from "./ContentPanelBackShortcuts";
import { ContentMainScrollShortcuts } from "./ContentMainScrollShortcuts";
import { LinearProjectViewShortcuts } from "./LinearProjectViewShortcuts";
import { PanelToggleShortcuts } from "./PanelToggleShortcuts";
import { RightPanelChatFocusShortcuts } from "./RightPanelChatFocusShortcuts";
import { SidebarNavCycleShortcuts } from "./SidebarNavCycleShortcuts";
import { SidebarNoteCreationShortcuts } from "./SidebarNoteCreationShortcuts";
import { SidebarNoteDeletionShortcuts } from "./SidebarNoteDeletionShortcuts";
import { TiptapEditorFocusShortcuts } from "./TiptapEditorFocusShortcuts";
import { LinearIssuePropertyShortcuts } from "./LinearIssuePropertyShortcuts";
import { VaultDocumentTitleFocusShortcuts } from "./VaultDocumentTitleFocusShortcuts";
import { useCommandPaletteShortcut } from "./useCommandPaletteShortcut";

export function AppShellShortcuts({
  settingsOpen,
  commandPaletteOpen,
  linearSidebarTeamConfig,
  activeVaultNavItem,
  onVaultNavItemChange,
  onOpenSettings,
  onSettingsTabChange,
  onToggleLeftSidePanel,
  onToggleRightSidePanel,
  onToggleContentPanelSidebar,
  onOpenRightSidePanel,
  rightSidePanelOpen,
  rightPanelChatBlocked = false,
}: {
  settingsOpen: boolean;
  commandPaletteOpen: boolean;
  linearSidebarTeamConfig?: LinearSidebarTeamConfig;
  activeVaultNavItem: SidebarNavItemId | null;
  onVaultNavItemChange: (item: SidebarNavItemId | null) => void;
  onOpenSettings: () => void;
  onSettingsTabChange: (tab: SettingsTabId) => void;
  onToggleLeftSidePanel: () => void;
  onToggleRightSidePanel: () => void;
  onToggleContentPanelSidebar: () => void;
  onOpenRightSidePanel: () => void;
  rightSidePanelOpen: boolean;
  rightPanelChatBlocked?: boolean;
}) {
  const globalShortcutsEnabled = !settingsOpen && !commandPaletteOpen;
  const panelShortcutsEnabled = !settingsOpen;
  const rightPanelShortcutsEnabled = panelShortcutsEnabled && !rightPanelChatBlocked;

  useLeaderKeyRegistration(globalShortcutsEnabled);
  useCommandPaletteShortcut({ enabled: !settingsOpen });

  return (
    <>
      <ContentMainScrollShortcuts enabled={globalShortcutsEnabled} />
      <ContentListNavigationShortcuts enabled={globalShortcutsEnabled} />
      <LinearProjectViewShortcuts enabled={globalShortcutsEnabled} />
      <ContentPanelBackShortcuts
        enabled={globalShortcutsEnabled}
        settingsOpen={settingsOpen}
        activeVaultNavItem={activeVaultNavItem}
      />
      <TiptapEditorFocusShortcuts enabled={globalShortcutsEnabled} />
      <LinearIssuePropertyShortcuts enabled={globalShortcutsEnabled} />
      <VaultDocumentTitleFocusShortcuts enabled={globalShortcutsEnabled} />
      <RightPanelChatFocusShortcuts
        enabled={globalShortcutsEnabled && !rightPanelChatBlocked}
        rightSidePanelOpen={rightSidePanelOpen}
        onOpenRightSidePanel={onOpenRightSidePanel}
      />
      <PanelToggleShortcuts
        enabled={panelShortcutsEnabled}
        rightPanelToggleEnabled={rightPanelShortcutsEnabled}
        onToggleLeftSidePanel={onToggleLeftSidePanel}
        onToggleRightSidePanel={onToggleRightSidePanel}
        onToggleContentPanelSidebar={onToggleContentPanelSidebar}
      />
      <SidebarNavCycleShortcuts
        enabled={globalShortcutsEnabled}
        activeVaultNavItem={activeVaultNavItem}
        linearSidebarTeamConfig={linearSidebarTeamConfig}
        onVaultNavItemChange={onVaultNavItemChange}
      />
      <SidebarNoteCreationShortcuts enabled={globalShortcutsEnabled} />
      <SidebarNoteDeletionShortcuts enabled={globalShortcutsEnabled} />
      <AppNavigationShortcuts
        enabled={globalShortcutsEnabled}
        linearSidebarTeamConfig={linearSidebarTeamConfig}
        onVaultNavItemChange={onVaultNavItemChange}
        onOpenSettings={onOpenSettings}
        onSettingsTabChange={onSettingsTabChange}
      />
    </>
  );
}
