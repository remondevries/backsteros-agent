import { useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import type { LinearSidebarTeamConfig } from "../app/sidebarNavConfig";
import { APP_HOTKEY_OPTIONS } from "./hotkeyOptions";
import {
  getAdjacentSidebarNavItem,
  type SidebarNavCycleDirection,
} from "./navigationShortcutBindings";
import { SIDEBAR_NAV_CYCLE_SHORTCUTS } from "./sidebarNavCycleShortcutBindings";

function SidebarNavCycleShortcut({
  keys,
  enabled,
  onTrigger,
}: {
  keys: string;
  enabled: boolean;
  onTrigger: () => void;
}) {
  useHotkeys(
    keys,
    (event) => {
      event.preventDefault();
      onTrigger();
    },
    { ...APP_HOTKEY_OPTIONS, enabled },
    [onTrigger, enabled],
  );
  return null;
}

export function SidebarNavCycleShortcuts({
  enabled,
  activeVaultNavItem,
  linearSidebarTeamConfig,
  onVaultNavItemChange,
}: {
  enabled: boolean;
  activeVaultNavItem: SidebarNavItemId | null;
  linearSidebarTeamConfig?: LinearSidebarTeamConfig;
  onVaultNavItemChange: (item: SidebarNavItemId | null) => void;
}) {
  const cycle = useCallback(
    (direction: SidebarNavCycleDirection) => {
      const nextItem = getAdjacentSidebarNavItem(
        activeVaultNavItem,
        direction,
        linearSidebarTeamConfig,
      );
      if (nextItem !== activeVaultNavItem) {
        onVaultNavItemChange(nextItem);
      }
    },
    [activeVaultNavItem, linearSidebarTeamConfig, onVaultNavItemChange],
  );

  return (
    <>
      {SIDEBAR_NAV_CYCLE_SHORTCUTS.map((binding) => (
        <SidebarNavCycleShortcut
          key={binding.keys}
          keys={binding.keys}
          enabled={enabled}
          onTrigger={() => cycle(binding.direction)}
        />
      ))}
    </>
  );
}
