import { useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useCommandPaletteActions } from "../command-palette/useCommandPaletteActions";
import type { CommandPaletteItem } from "../command-palette/types";
import {
  NAVIGATION_LEADER_SHORTCUTS,
  navigationShortcutLabel,
  SETTINGS_LEADER_SHORTCUT,
} from "../shortcuts/navigationShortcutBindings";
import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import type { SettingsTabId } from "../settings/settingsTabs";
import { LEADER_SEQUENCE_HOTKEY_OPTIONS } from "./hotkeyOptions";

function NavigationLeaderShortcut({
  keys,
  enabled,
  onTrigger,
}: {
  keys: string;
  enabled: boolean;
  onTrigger: () => void;
}) {
  useHotkeys(keys, onTrigger, { ...LEADER_SEQUENCE_HOTKEY_OPTIONS, enabled }, [onTrigger, enabled]);
  return null;
}

export function AppNavigationShortcuts({
  enabled,
  onVaultNavItemChange,
  onOpenSettings,
  onSettingsTabChange,
}: {
  enabled: boolean;
  onVaultNavItemChange: (item: SidebarNavItemId | null) => void;
  onOpenSettings: () => void;
  onSettingsTabChange: (tab: SettingsTabId) => void;
}) {
  const performItem = useCommandPaletteActions({
    onVaultNavItemChange,
    onOpenSettings,
    onSettingsTabChange,
    onClose: () => {},
  });

  const navigateTo = useCallback(
    (navItemId: SidebarNavItemId) => {
      const item: CommandPaletteItem = {
        kind: "navigate",
        id: `nav-${navItemId}`,
        section: "Navigate",
        label: navigationShortcutLabel(navItemId),
        navItemId,
      };
      performItem(item);
    },
    [performItem],
  );

  const openSettings = useCallback(() => {
    performItem({
      kind: "settings",
      id: "settings-root",
      section: "Navigate",
      label: "Settings",
      subtitle: "Open settings",
    });
  }, [performItem]);

  return (
    <>
      {NAVIGATION_LEADER_SHORTCUTS.map((binding) => (
        <NavigationLeaderShortcut
          key={binding.keys}
          keys={binding.keys}
          enabled={enabled}
          onTrigger={() => navigateTo(binding.navItemId)}
        />
      ))}
      <NavigationLeaderShortcut
        keys={SETTINGS_LEADER_SHORTCUT.keys}
        enabled={enabled}
        onTrigger={openSettings}
      />
    </>
  );
}
