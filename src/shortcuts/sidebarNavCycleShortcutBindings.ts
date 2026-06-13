export type SidebarNavCycleDirection = "up" | "down";

export type SidebarNavCycleShortcutBinding = {
  keys: string;
  hint: string;
  direction: SidebarNavCycleDirection;
};

export const SIDEBAR_NAV_CYCLE_SHORTCUTS: SidebarNavCycleShortcutBinding[] = [
  { keys: "mod+alt+up", hint: "⌃⌥↑", direction: "up" },
  { keys: "mod+alt+down", hint: "⌃⌥↓", direction: "down" },
];
