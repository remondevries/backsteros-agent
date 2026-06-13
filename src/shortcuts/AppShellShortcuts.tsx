import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import type { SettingsTabId } from "../settings/settingsTabs";
import { AppNavigationShortcuts } from "./AppNavigationShortcuts";
import { ContentListNavigationShortcuts } from "./ContentListNavigationShortcuts";
import { ContentPanelBackShortcuts } from "./ContentPanelBackShortcuts";
import { ContentMainScrollShortcuts } from "./ContentMainScrollShortcuts";
import { LinearProjectViewShortcuts } from "./LinearProjectViewShortcuts";
import { PanelToggleShortcuts } from "./PanelToggleShortcuts";
import { RightPanelChatFocusShortcuts } from "./RightPanelChatFocusShortcuts";
import { SidebarNavCycleShortcuts } from "./SidebarNavCycleShortcuts";
import { TiptapEditorFocusShortcuts } from "./TiptapEditorFocusShortcuts";
import { VaultDocumentTitleFocusShortcuts } from "./VaultDocumentTitleFocusShortcuts";
import { useCommandPaletteShortcut } from "./useCommandPaletteShortcut";

export function AppShellShortcuts({
  settingsOpen,
  commandPaletteOpen,
  activeVaultNavItem,
  onVaultNavItemChange,
  onOpenSettings,
  onSettingsTabChange,
  onToggleLeftSidePanel,
  onToggleRightSidePanel,
  onToggleContentPanelSidebar,
  onOpenRightSidePanel,
  rightSidePanelOpen,
}: {
  settingsOpen: boolean;
  commandPaletteOpen: boolean;
  activeVaultNavItem: SidebarNavItemId | null;
  onVaultNavItemChange: (item: SidebarNavItemId | null) => void;
  onOpenSettings: () => void;
  onSettingsTabChange: (tab: SettingsTabId) => void;
  onToggleLeftSidePanel: () => void;
  onToggleRightSidePanel: () => void;
  onToggleContentPanelSidebar: () => void;
  onOpenRightSidePanel: () => void;
  rightSidePanelOpen: boolean;
}) {
  const globalShortcutsEnabled = !settingsOpen && !commandPaletteOpen;
  const panelShortcutsEnabled = !settingsOpen;

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
      <VaultDocumentTitleFocusShortcuts enabled={globalShortcutsEnabled} />
      <RightPanelChatFocusShortcuts
        enabled={globalShortcutsEnabled}
        rightSidePanelOpen={rightSidePanelOpen}
        onOpenRightSidePanel={onOpenRightSidePanel}
      />
      <PanelToggleShortcuts
        enabled={panelShortcutsEnabled}
        onToggleLeftSidePanel={onToggleLeftSidePanel}
        onToggleRightSidePanel={onToggleRightSidePanel}
        onToggleContentPanelSidebar={onToggleContentPanelSidebar}
      />
      <SidebarNavCycleShortcuts
        enabled={globalShortcutsEnabled}
        activeVaultNavItem={activeVaultNavItem}
        onVaultNavItemChange={onVaultNavItemChange}
      />
      <AppNavigationShortcuts
        enabled={globalShortcutsEnabled}
        onVaultNavItemChange={onVaultNavItemChange}
        onOpenSettings={onOpenSettings}
        onSettingsTabChange={onSettingsTabChange}
      />
    </>
  );
}
