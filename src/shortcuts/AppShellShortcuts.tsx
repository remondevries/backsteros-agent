import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import type { SettingsTabId } from "../settings/settingsTabs";
import { AppNavigationShortcuts } from "./AppNavigationShortcuts";
import { ContentListNavigationShortcuts } from "./ContentListNavigationShortcuts";
import { ContentMainScrollShortcuts } from "./ContentMainScrollShortcuts";
import { PanelToggleShortcuts } from "./PanelToggleShortcuts";
import { SidebarNavCycleShortcuts } from "./SidebarNavCycleShortcuts";
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
}) {
  const globalShortcutsEnabled = !settingsOpen && !commandPaletteOpen;
  const panelShortcutsEnabled = !settingsOpen;

  useCommandPaletteShortcut({ enabled: !settingsOpen });

  return (
    <>
      <ContentMainScrollShortcuts enabled={globalShortcutsEnabled} />
      <ContentListNavigationShortcuts enabled={globalShortcutsEnabled} />
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
