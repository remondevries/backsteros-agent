export type PanelToggleAction = "left" | "right" | "content-sidebar";

export type PanelToggleShortcutBinding = {
  keys: string;
  hint: string;
  action: PanelToggleAction;
};

export const PANEL_TOGGLE_SHORTCUTS: PanelToggleShortcutBinding[] = [
  { keys: "[", hint: "[", action: "left" },
  { keys: "]", hint: "]", action: "right" },
  { keys: "\\", hint: "\\", action: "content-sidebar" },
];
